import { prisma } from '$lib/../prisma/client';
import { Prisma } from '@prisma/client';
import type {
	AchievementClaim,
	Achievement,
	User,
	Identifier,
	AchievementCredential
} from '@prisma/client';
import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';
import { isCredentialCacheExired } from '$lib/credentials/credentialHelper';

/** Thrown when the org issues via wallet exchange and has no locally-signable credential. */
export class TransactionServiceIssuerError extends Error {}

type ClaimWithRelations = AchievementClaim & {
	credential: AchievementCredential | null;
	achievement: Achievement;
	user: User & { identifiers: Identifier[] };
};

export interface EnsureClaimCredentialOptions {
	/** If true, re-sign when the cached credential is stale (download=true). If false, only mint when absent (getCredentials=false). */
	regenerateIfStale: boolean;
	/** User to attribute as creator on a newly minted credential row. */
	creatorUserId: string;
}

/**
 * Returns the signed AchievementCredential for an accepted claim, minting + persisting one
 * if needed. Throws TransactionServiceIssuerError for wallet-exchange orgs (caller decides).
 * Propagates IssuerMisconfiguredError from the signing path.
 */
export async function ensureClaimCredential(
	claim: ClaimWithRelations,
	org: App.Organization,
	opts: EnsureClaimCredentialOptions
): Promise<AchievementCredential> {
	const orgConfig = (
		typeof org.json === 'object' && org.json !== null ? org.json : {}
	) as App.OrganizationConfig;
	if (orgConfig.issuer?.type === 'transactionService') {
		throw new TransactionServiceIssuerError();
	}

	const needsMint =
		!claim.credential || (opts.regenerateIfStale && isCredentialCacheExired(claim.credential));
	if (!needsMint && claim.credential) return claim.credential;

	const signedCredential = await achievementClaimToCredential(claim, org); // may throw IssuerMisconfiguredError

	if (claim.credential) {
		return prisma.achievementCredential.update({
			where: { id: claim.credential.id },
			data: {
				identifier: signedCredential.id,
				subjectId: signedCredential.credentialSubject.id,
				json: JSON.parse(JSON.stringify(signedCredential)) as Prisma.InputJsonValue
			}
		});
	}
	return prisma.achievementCredential.create({
		data: {
			organization: { connect: { id: org.id } },
			achievement: { connect: { id: claim.achievementId } },
			creatorUser: { connect: { id: opts.creatorUserId } },
			claim: { connect: { id: claim.id } },
			identifier: signedCredential.id,
			subjectId: signedCredential.credentialSubject.id,
			json: JSON.parse(JSON.stringify(signedCredential)) as Prisma.InputJsonValue
		}
	});
}
