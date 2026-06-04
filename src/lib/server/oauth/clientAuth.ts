import type { OAuthClient, Organization } from '@prisma/client';
import { prisma } from '$lib/../prisma/client';
import { verifySecret } from './secretHash';

/**
 * Decode an HTTP `Authorization: Basic ...` header carrying client credentials
 * per RFC6749 §2.3.1. Returns null for anything that isn't a well-formed
 * `Basic base64(clientId:clientSecret)`. Each component is URL-decoded.
 */
export function parseClientSecretBasic(
	authHeader: string | null
): { clientId: string; clientSecret: string } | null {
	if (!authHeader) return null;
	const [scheme, encoded, ...rest] = authHeader.trim().split(/\s+/);
	if (rest.length > 0 || !encoded || scheme.toLowerCase() !== 'basic') return null;

	let decoded: string;
	try {
		decoded = Buffer.from(encoded, 'base64').toString('utf8');
	} catch {
		return null;
	}

	const sep = decoded.indexOf(':');
	if (sep === -1) return null;

	const rawClientId = decoded.slice(0, sep);
	const rawClientSecret = decoded.slice(sep + 1);

	let clientId: string;
	let clientSecret: string;
	try {
		clientId = decodeURIComponent(rawClientId);
		clientSecret = decodeURIComponent(rawClientSecret);
	} catch {
		return null;
	}

	if (!clientId) return null;
	return { clientId, clientSecret };
}

/**
 * Look up a client by `clientId` scoped to the org and verify its secret with
 * scrypt (constant-time). Honours `disabledAt`, `deletedAt`, and
 * `clientSecretExpiresAt`. Authenticates both USER_DELEGATED and
 * CONFIDENTIAL_SERVICE clients.
 */
export async function verifyClient(
	org: Organization,
	clientId: string,
	clientSecret: string
): Promise<OAuthClient | null> {
	const client = await prisma.oAuthClient.findFirst({
		where: { clientId, organizationId: org.id }
	});
	if (!client) return null;
	if (client.disabledAt || client.deletedAt) return null;
	if (client.clientSecretExpiresAt && client.clientSecretExpiresAt.getTime() <= Date.now()) {
		return null;
	}
	if (!verifySecret(clientSecret, client.clientSecretHash)) return null;
	return client;
}
