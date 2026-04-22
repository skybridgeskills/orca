import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '$lib/../prisma/client';

import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';
import type { AchievementCredential } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { isCredentialCacheExired } from '$lib/credentials/credentialHelper';
import { IssuerMisconfiguredError } from '$lib/server/signingKey/resolver';

export const POST = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) throw error(404, m.best_sharp_lamb_enchant());

	const orgConfig = (
		typeof locals.org?.json === 'object' && locals.org.json !== null ? locals.org.json : {}
	) as App.OrganizationConfig;
	if (orgConfig.issuer?.type === 'transactionService') {
		throw error(
			409,
			'This organization is configured for wallet exchange. Use POST /claims/[id]/exchange.'
		);
	}

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: {
			credential: true,
			achievement: true,
			user: {
				include: { identifiers: true }
			}
		}
	});

	// User can only download their own badges
	if (!claim || claim?.organizationId != locals.org.id || claim?.userId != locals.session.user?.id)
		throw error(404, m.best_sharp_lamb_enchant());

	// const config = achievement.achievementConfig;
	// const claimEvidence = claim.json as App.EvidenceItem;

	let result: AchievementCredential;

	// If the previous JSON was more than 10 minutes old, generate a new credential
	if (!claim?.credential || isCredentialCacheExired(claim.credential)) {
		let signedCredential: App.OpenBadgeCredential;
		try {
			signedCredential = await achievementClaimToCredential(claim, locals.org);
		} catch (err) {
			if (err instanceof IssuerMisconfiguredError) {
				throw error(
					503,
					'Issuer signing key is no longer available. An administrator must update issuer settings.'
				);
			}
			throw err;
		}

		if (claim.credential) {
			result = await prisma.achievementCredential.update({
				where: { id: claim.credential.id },
				data: {
					identifier: signedCredential.id,
					subjectId: signedCredential.credentialSubject.id,
					json: JSON.parse(JSON.stringify(signedCredential)) as Prisma.InputJsonValue
				}
			});
		} else {
			result = await prisma.achievementCredential.create({
				data: {
					organization: { connect: { id: locals.org.id } },
					achievement: { connect: { id: claim.achievementId } },
					creatorUser: { connect: { id: locals.session.user.id } },
					claim: { connect: { id: claim.id } },

					identifier: signedCredential.id,
					subjectId: signedCredential.credentialSubject.id,

					json: JSON.parse(JSON.stringify(signedCredential)) as Prisma.InputJsonValue
				}
			});
		}
	} else {
		result = claim.credential;
	}
	return json(result.json);
};
