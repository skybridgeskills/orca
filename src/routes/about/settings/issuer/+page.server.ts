import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { ValidationError } from 'yup';
import { prisma } from '../../../../prisma/client';
import { encrypt } from '$lib/server/secrets/orgConfigCrypto';
import { setIssuerSchema, setTransactionServiceSchema, removeApiKeySchema } from './schema';

const ALLOWED_ROLES = ['GENERAL_ADMIN', 'CONTENT_ADMIN'];

export const load: PageServerLoad = async ({ locals }) => {
	if (!ALLOWED_ROLES.includes(locals.session?.user?.orgRole ?? 'none')) {
		throw redirect(302, '/about');
	}

	const jsonData = readOrgJson(locals.org);

	const signingKeys = await prisma.signingKey.findMany({
		where: { organizationId: locals.org.id, revoked: false },
		select: { id: true, publicKeyMultibase: true }
	});

	const rawTs = jsonData.transactionService;
	const transactionService =
		rawTs !== undefined && rawTs !== null && typeof rawTs === 'object' && !Array.isArray(rawTs)
			? {
					url: String((rawTs as { url?: string }).url ?? ''),
					tenantName: String((rawTs as { tenantName?: string }).tenantName ?? ''),
					apiKeyConfigured: Boolean((rawTs as { encryptedApiKey?: string }).encryptedApiKey),
					apiKeyUpdatedAt: (rawTs as { apiKeyUpdatedAt?: string | null }).apiKeyUpdatedAt ?? null
				}
			: null;

	const issuer = jsonData.issuer ?? null;

	let missingActiveKey: { id: string } | undefined;
	if (issuer?.type === 'signingKey') {
		if (!signingKeys.find((k) => k.id === issuer.signingKeyId)) {
			missingActiveKey = { id: issuer.signingKeyId };
		}
	}

	return { signingKeys, issuer, transactionService, missingActiveKey };
};

export const actions: Actions = {
	setIssuer: async ({ request, locals }) => {
		assertAdmin(locals);

		const formData = await request.formData();
		const type = formData.get('type')?.toString();
		const signingKeyIdRaw = formData.get('signingKeyId')?.toString();

		const payload: { type: string; signingKeyId?: string } = { type: type ?? '' };
		if (signingKeyIdRaw) {
			payload.signingKeyId = signingKeyIdRaw;
		}

		let validated: { type: 'signingKey' | 'transactionService'; signingKeyId?: string };
		try {
			validated = await setIssuerSchema.validate(payload, { abortEarly: true });
		} catch (err) {
			if (err instanceof ValidationError) {
				return fail(400, { issuerError: err.message });
			}
			throw err;
		}
		if (validated.type === 'signingKey') {
			const key = await prisma.signingKey.findFirst({
				where: {
					id: validated.signingKeyId as string,
					organizationId: locals.org.id,
					revoked: false
				}
			});
			if (!key) {
				return fail(400, { issuerError: 'Signing key not found or revoked' });
			}
		}

		const nextIssuer: App.IssuerSelection =
			validated.type === 'signingKey'
				? { type: 'signingKey', signingKeyId: validated.signingKeyId as string }
				: { type: 'transactionService' };

		const current = readOrgJson(locals.org);
		const updatedJson: App.OrganizationConfig = { ...current, issuer: nextIssuer };

		await prisma.organization.update({
			where: { id: locals.org.id },
			data: { json: updatedJson as object }
		});

		return { ok: true };
	},

	setTransactionService: async ({ request, locals }) => {
		assertAdmin(locals);

		const formData = await request.formData();
		const formPayload = {
			url: formData.get('url')?.toString() ?? '',
			tenantName: formData.get('tenantName')?.toString() ?? '',
			apiKey: formData.get('apiKey')?.toString()
		};

		let validated: { url: string; tenantName: string; apiKey?: string | null };
		try {
			validated = await setTransactionServiceSchema.validate(formPayload, { abortEarly: true });
		} catch (err) {
			if (err instanceof ValidationError) {
				return fail(400, { transactionServiceError: err.message });
			}
			throw err;
		}

		const current = readOrgJson(locals.org);
		const existing: Partial<App.TransactionServiceOrgConfig> = current.transactionService ?? {};

		const next: {
			url: string;
			tenantName: string;
			encryptedApiKey?: string;
			apiKeyUpdatedAt?: string;
		} = {
			url: validated.url.trim(),
			tenantName: validated.tenantName.trim(),
			encryptedApiKey: existing.encryptedApiKey,
			apiKeyUpdatedAt: existing.apiKeyUpdatedAt
		};

		if (validated.apiKey?.trim()) {
			next.encryptedApiKey = encrypt(validated.apiKey.trim());
			next.apiKeyUpdatedAt = new Date().toISOString();
		}

		const updatedJson: App.OrganizationConfig = {
			...current,
			transactionService: next as App.TransactionServiceOrgConfig
		};

		await prisma.organization.update({
			where: { id: locals.org.id },
			data: { json: updatedJson as object }
		});

		return { ok: true };
	},

	removeApiKey: async ({ locals }) => {
		assertAdmin(locals);

		try {
			await removeApiKeySchema.validate({}, { abortEarly: true });
		} catch (err) {
			if (err instanceof ValidationError) {
				return fail(400, { transactionServiceError: err.message });
			}
			throw err;
		}

		const current = readOrgJson(locals.org);
		if (!current.transactionService) {
			return { ok: true };
		}

		const existing = current.transactionService;
		const next = {
			url: existing.url,
			tenantName: existing.tenantName
		};

		const updatedJson: App.OrganizationConfig = {
			...current,
			transactionService: next as App.TransactionServiceOrgConfig
		};

		await prisma.organization.update({
			where: { id: locals.org.id },
			data: { json: updatedJson as object }
		});

		return { ok: true };
	}
};

function readOrgJson(org: App.Organization): App.OrganizationConfig {
	const j = org.json as unknown;
	if (j === null || typeof j !== 'object' || Array.isArray(j)) {
		if (typeof j === 'string') {
			try {
				return JSON.parse(j) as App.OrganizationConfig;
			} catch {
				return {} as App.OrganizationConfig;
			}
		}
		return {} as App.OrganizationConfig;
	}
	return j as App.OrganizationConfig;
}

function assertAdmin(locals: App.Locals) {
	if (!ALLOWED_ROLES.includes(locals.session?.user?.orgRole ?? 'none')) {
		throw error(403, 'Forbidden');
	}
}
