import type { OAuthClient, Organization } from '@prisma/client';
import { prisma } from '$lib/../prisma/client';
import { hashSecret } from './secretHash';
import { generateOpaqueToken, CLIENT_SECRET_BYTES } from './tokens';
import { intersectSupportedApi } from './scopes';
import { revokeTokensForClient } from './accessToken';

/** Typed error for the confidential-client admin service. */
export class ConfidentialClientError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ConfidentialClientError';
	}
}

export interface CreateConfidentialClientParams {
	org: Organization;
	/** The app's OWNER / accountable actor (Option B). Required. */
	createdByUserId: string;
	clientName: string;
	clientUri?: string;
	scopes: string[];
}

/**
 * Create an org-level CONFIDENTIAL_SERVICE (client_credentials) app.
 * `createdByUserId` is required (the accountable owner). Scopes are narrowed to
 * SUPPORTED_API_SCOPES; an empty result is rejected. Returns the raw secret
 * once — it is never stored or logged.
 */
export async function createConfidentialClient(
	params: CreateConfidentialClientParams
): Promise<{ client: OAuthClient; clientSecret: string }> {
	const { org, createdByUserId, clientName, clientUri } = params;

	if (!createdByUserId) {
		throw new ConfidentialClientError('createdByUserId is required');
	}
	if (!clientName) {
		throw new ConfidentialClientError('clientName is required');
	}

	const scopes = intersectSupportedApi(params.scopes);
	if (scopes.length === 0) {
		throw new ConfidentialClientError('at least one supported API scope is required');
	}

	const clientId = generateOpaqueToken(16);
	const clientSecret = generateOpaqueToken(CLIENT_SECRET_BYTES);

	const client = await prisma.oAuthClient.create({
		data: {
			organizationId: org.id,
			clientId,
			clientSecretHash: hashSecret(clientSecret),
			clientType: 'CONFIDENTIAL_SERVICE',
			clientName,
			clientUri: clientUri ?? '',
			logoUri: '',
			tosUri: '',
			policyUri: '',
			contacts: [],
			redirectUris: [],
			scopes,
			grantTypes: ['client_credentials'],
			responseTypes: [],
			createdByUserId,
			clientSecretExpiresAt: null
		}
	});

	return { client, clientSecret };
}

export interface ConfidentialClientSummary {
	id: string;
	clientId: string;
	clientName: string;
	clientUri: string;
	scopes: string[];
	disabledAt: Date | null;
	createdAt: Date;
	lastUsedAt: Date | null;
}

/**
 * List the org's CONFIDENTIAL_SERVICE clients (newest first). Returns safe
 * fields only — never the secret/hash. `lastUsedAt` is derived from the
 * client's most-recently-used token.
 */
export async function listConfidentialClients(
	org: Organization
): Promise<ConfidentialClientSummary[]> {
	const clients = await prisma.oAuthClient.findMany({
		where: { organizationId: org.id, clientType: 'CONFIDENTIAL_SERVICE', deletedAt: null },
		orderBy: { createdAt: 'desc' },
		include: {
			accessTokens: {
				where: { lastUsedAt: { not: null } },
				orderBy: { lastUsedAt: 'desc' },
				take: 1,
				select: { lastUsedAt: true }
			}
		}
	});

	return clients.map((c) => ({
		id: c.id,
		clientId: c.clientId,
		clientName: c.clientName,
		clientUri: c.clientUri,
		scopes: c.scopes,
		disabledAt: c.disabledAt,
		createdAt: c.createdAt,
		lastUsedAt: c.accessTokens[0]?.lastUsedAt ?? null
	}));
}

/**
 * Soft-disable a confidential client and revoke all its tokens. Idempotent.
 * Disable (not delete) to preserve the audit trail.
 */
export async function disableConfidentialClient(
	org: Organization,
	clientInternalId: string
): Promise<void> {
	await prisma.oAuthClient.updateMany({
		where: {
			id: clientInternalId,
			organizationId: org.id,
			clientType: 'CONFIDENTIAL_SERVICE',
			disabledAt: null
		},
		data: { disabledAt: new Date() }
	});
	await revokeTokensForClient(org, clientInternalId);
}

/**
 * Soft-delete a confidential client and revoke all its tokens. Idempotent.
 * Sets `deletedAt` so the app disappears from the admin list while its history
 * row remains in the database (only a hard org delete would remove it). A
 * soft-deleted client can no longer authenticate — see `verifyClient`.
 */
export async function deleteConfidentialClient(
	org: Organization,
	clientInternalId: string
): Promise<void> {
	await prisma.oAuthClient.updateMany({
		where: {
			id: clientInternalId,
			organizationId: org.id,
			clientType: 'CONFIDENTIAL_SERVICE',
			deletedAt: null
		},
		data: { deletedAt: new Date() }
	});
	await revokeTokensForClient(org, clientInternalId);
}

/**
 * Rotate a confidential client's secret. Returns the new raw secret once;
 * only the scrypt hash is persisted. Never logged.
 */
export async function rotateConfidentialClientSecret(
	org: Organization,
	clientInternalId: string
): Promise<{ clientSecret: string }> {
	const clientSecret = generateOpaqueToken(CLIENT_SECRET_BYTES);
	const updated = await prisma.oAuthClient.updateMany({
		where: {
			id: clientInternalId,
			organizationId: org.id,
			clientType: 'CONFIDENTIAL_SERVICE'
		},
		data: { clientSecretHash: hashSecret(clientSecret), clientSecretExpiresAt: null }
	});
	if (updated.count === 0) {
		throw new ConfidentialClientError('confidential client not found');
	}
	return { clientSecret };
}

// Owner lifecycle (Option B invariant): a confidential client's writes are
// attributed to its owner (createdByUserId). If that user is removed or loses
// GENERAL_ADMIN, the app MUST NOT keep acting as them — a write must never fall
// back to a null creatorId. The enforcement point is the org-membership /
// role-change and user-deletion paths, which should call
// disableConfidentialClient (or block) for the owner's confidential clients.
// TODO(security): wire this hook into the membership/role-change and
// user-deletion flows (Phase 7+). Those paths are out of scope for Phase 2
// (this module owns no routes), so the rule is documented here and surfaced in
// the phase summary rather than implemented across unrelated files.
