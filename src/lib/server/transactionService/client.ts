import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';
import { BadOrgConfigBlobError, decrypt } from '$lib/server/secrets/orgConfigCrypto';

import { isExchangeAvailable } from './config';
import redactedFetch from './redactedFetch';

/**
 * Result of creating a claim exchange. `expiresAt` is a local UI hint (10 minutes from
 * creation) and is not returned by the upstream transaction service — do not treat it
 * as a server-issued contract.
 */
export type TransactionServiceExchange = {
	exchangeId: string;
	protocols: {
		iu: string;
		vcapi: string;
		lcw: string;
		verifiablePresentationRequest: object;
	};
	/** Local UI hint, not returned by the upstream service. `Date.now() + 10*60*1000` ISO. */
	expiresAt: string;
};

export class TransactionServiceUpstreamError extends Error {
	status?: number;
	constructor(message: string, opts?: { status?: number; cause?: unknown }) {
		super(message);
		this.name = 'TransactionServiceUpstreamError';
		if (opts?.status !== undefined) this.status = opts.status;
		if (opts?.cause !== undefined) (this as Error & { cause?: unknown }).cause = opts.cause;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

export async function createExchange(
	org: App.Organization,
	{ vc }: { vc: object }
): Promise<TransactionServiceExchange> {
	if (!isExchangeAvailable(org)) {
		throw new IssuerMisconfiguredError(
			`Transaction service is not configured for organization ${org.id}.`
		);
	}
	const transactionService = readTransactionServiceConfig(org);
	const apiKey = decrypt(transactionService.encryptedApiKey);

	const baseUrl = transactionService.url.replace(/\/$/, '');
	const url = `${baseUrl}/workflows/claim/exchanges`;
	const body = {
		variables: { tenantName: transactionService.tenantName, vc: JSON.stringify(vc) }
	};

	let response: Response;
	try {
		response = await redactedFetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
				Accept: 'application/json'
			},
			body: JSON.stringify(body)
		});
	} catch (err) {
		if (err instanceof TransactionServiceUpstreamError) {
			throw err;
		}
		if (err instanceof BadOrgConfigBlobError || err instanceof IssuerMisconfiguredError) {
			throw err;
		}
		throw new TransactionServiceUpstreamError('Failed to reach transaction service', {
			cause: err
		});
	}

	if (!response.ok) {
		let bodyText = '';
		try {
			bodyText = await response.text();
		} catch {
			// best effort
		}
		throw new TransactionServiceUpstreamError(`Transaction service returned ${response.status}`, {
			status: response.status,
			cause: bodyText
		});
	}

	const data = (await response.json()) as Record<string, unknown>;
	const rawId = data.id;
	if (typeof rawId !== 'string' || rawId.length === 0) {
		throw new TransactionServiceUpstreamError('Missing exchange id in response', {
			status: response.status
		});
	}
	if (!('protocols' in data) || data.protocols === undefined) {
		throw new TransactionServiceUpstreamError('Missing protocols in response', { status: 200 });
	}
	const protocols = data.protocols;
	if (protocols === null || typeof protocols !== 'object' || Array.isArray(protocols)) {
		throw new TransactionServiceUpstreamError('Missing protocols in response', { status: 200 });
	}

	return {
		exchangeId: rawId,
		protocols: protocols as TransactionServiceExchange['protocols'],
		expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
	};
}

function readOrgJson(org: App.Organization): App.OrganizationConfig | null {
	const j = org.json as unknown;
	if (j === null || typeof j !== 'object' || Array.isArray(j)) {
		return null;
	}
	return j as App.OrganizationConfig;
}

function readTransactionServiceConfig(org: App.Organization): {
	url: string;
	tenantName: string;
	encryptedApiKey: string;
} {
	const config = readOrgJson(org);
	const ts = config?.transactionService;
	if (!ts) {
		throw new IssuerMisconfiguredError(
			`Transaction service is not configured for organization ${org.id}.`
		);
	}
	return {
		url: ts.url,
		tenantName: ts.tenantName,
		encryptedApiKey: ts.encryptedApiKey
	};
}
