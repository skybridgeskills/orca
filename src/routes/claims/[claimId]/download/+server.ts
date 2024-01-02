import * as m from '$lib/i18n/messages';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { prisma } from '$lib/../prisma/client';

import { achievementClaimToCredential } from '$lib/credentials/achievementCredential';
import type { AchievementCredential } from '@prisma/client';
import { isCredentialCacheExired } from '$lib/credentials/credentialHelper';

export const POST = async ({ locals, params }: RequestEvent) => {
	if (!locals.session?.user?.id) throw error(404, m.claim_notFoundError());

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
		throw error(404, m.claim_notFoundError());

	// const config = achievement.achievementConfig;
	// const claimEvidence = claim.json as App.EvidenceItem;

	let result: AchievementCredential;

	// If the previous JSON was more than 10 minutes old, generate a new credential
	if (!claim?.credential || isCredentialCacheExired(claim.credential)) {
		const signedCredential = await achievementClaimToCredential(claim, locals.org);

		if (claim.credential) {
			result = await prisma.achievementCredential.update({
				where: { id: claim.credential.id },
				data: {
					identifier: signedCredential.id,
					subjectId: signedCredential.credentialSubject.id,
					json: { ...signedCredential }
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

					json: { ...signedCredential }
				}
			});
		}
	} else {
		result = claim.credential;
	}
	return json(result.json);
};
