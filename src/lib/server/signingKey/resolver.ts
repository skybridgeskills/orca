import type { SigningKey } from '@prisma/client';
import { prisma } from '../../../prisma/client';

export class IssuerMisconfiguredError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'IssuerMisconfiguredError';
	}
}

/**
 * Chooses the {@link SigningKey} used for the local signing path.
 *
 * - When `org.json.issuer` selects `type: 'signingKey'` with a non-empty `signingKeyId`,
 *   loads that key if it belongs to the org and is not revoked.
 * - Otherwise (no issuer, incomplete selection, or `transactionService`), uses the first
 *   non-revoked key ordered by `id` ascending (stable when multiple keys exist).
 *
 * @throws {IssuerMisconfiguredError} When a signing key id is configured but not available.
 * @throws Propagates Prisma errors (for example record-not-found from `findFirstOrThrow`) when no key matches the fallback.
 */
export async function resolveActiveSigningKey(org: App.Organization): Promise<SigningKey> {
	const issuer = getIssuerSelection(org);

	if (
		issuer?.type === 'signingKey' &&
		typeof issuer.signingKeyId === 'string' &&
		issuer.signingKeyId.length > 0
	) {
		const signingKeyId = issuer.signingKeyId;
		const key = await prisma.signingKey.findFirst({
			where: {
				id: signingKeyId,
				organizationId: org.id,
				revoked: false
			}
		});
		if (!key) {
			throw new IssuerMisconfiguredError(
				`Selected signing key ${signingKeyId} is not available for organization ${org.id}.`
			);
		}
		return key;
	}

	return prisma.signingKey.findFirstOrThrow({
		where: {
			organizationId: org.id,
			revoked: false
		},
		orderBy: { id: 'asc' }
	});
}

function readOrgJson(org: App.Organization): App.OrganizationConfig | null {
	const j = org.json as unknown;
	if (j === null || typeof j !== 'object' || Array.isArray(j)) {
		return null;
	}
	return j as App.OrganizationConfig;
}

function getIssuerSelection(org: App.Organization): App.IssuerSelection | undefined {
	const config = readOrgJson(org);
	return config?.issuer;
}
