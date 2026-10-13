import type { Visibility } from '@prisma/client';
import { error, fail, redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import type { IssuerMode } from '$lib/claimViewModel';
import { getAchievement } from '$lib/data/achievement';
import { getValidUserClaim } from '$lib/data/achievementClaim';
import * as m from '$lib/i18n/messages';
import { canViewClaim, viewerRole } from '$lib/server/claimVisibility';
import { activeSuspensionFor } from '$lib/server/moderation/suspension';
import { isMemberOrOpen } from '$lib/server/permissions';
import { isVisibility } from '$lib/server/visibility';

import type { Actions, PageServerLoad } from './$types';

const throwRedirect = (url: URL) => {
	redirect(307, `${url}/public`);
};

export const load: PageServerLoad = async ({ locals, params, url }) => {
	if (!locals.session?.user) return throwRedirect(url);

	const claim = await prisma.achievementClaim.findUnique({
		where: { id: params.claimId },
		include: { user: true }
	});

	if (!claim || claim.organizationId != locals.org.id) error(404, m.best_sharp_lamb_enchant());
	// `viewerRole` resolves owner > admin > community > public once, for the
	// visibility check, the suspension check and the view-model below.
	const role = viewerRole(claim, locals.session);
	// Visibility: owner and admins always pass; PRIVATE claims of others are hidden
	// from community viewers, and COMMUNITY ones from non-members. Membership is only
	// looked up when it can change the answer. 404 (not 403) avoids confirming existence.
	const viewerIsMember =
		role === 'community' && claim.visibility !== 'PUBLIC'
			? await isMemberOrOpen({ user: locals.session.user, org: locals.org })
			: true;
	if (!canViewClaim(claim, locals.session, { viewerIsMember }))
		error(404, m.best_sharp_lamb_enchant());

	// P5 moderation: a suspended claim is hidden from community/public; only the owner
	// and admins may still see it, with a suspended marker.
	const claimSuspension = await activeSuspensionFor({
		originOrgId: locals.org.id,
		targetType: 'CLAIM',
		targetId: claim.id
	});
	const viewerMaySeeSuspended = role === 'owner' || role === 'admin';
	if (claimSuspension && !viewerMaySeeSuspended) error(404, m.best_sharp_lamb_enchant());

	const achievement = await getAchievement(claim.achievementId, locals.org.id);

	const hasProvidedEndorsement = !!(await prisma.claimEndorsement.findFirst({
		where: {
			claimId: params.claimId,
			creatorId: locals.session.user.id
		}
	}));

	// If the user has been directly invited to claim the badge, let them proceed
	const endorsementCount = await prisma.claimEndorsement.count({
		where: {
			claimId: params.claimId
		}
	});

	// If this badge requires a member to hold another badge, get the relevant claim for that badge.
	// If they have it, they are eligible to claim this badge. Only bother to do this if they don't already
	// have a claim.
	const prerequisiteClaim =
		!claim && achievement.claimable && achievement.claimRequiresId && locals.session?.user.id
			? await getValidUserClaim(locals.session?.user.id, achievement.claimRequiresId, locals.org.id)
			: null;

	return {
		organization: locals.org,
		claim,
		achievement,
		// P3: resolve the viewer's role once (P1's `viewerRole`) so the client
		// `ClaimDetail` view-model never recomputes `session.user.id == claim.userId`
		// inline. Does not affect the authz/404 gating above (P2-owned).
		viewer: role,
		// P5: present to owner/admin only (others 404 above). Drives the suspended marker.
		suspension: claimSuspension ? { tier: claimSuspension.tier } : null,
		hasProvidedEndorsement,
		endorsementCount,
		user: locals.session?.user,
		prerequisiteClaim,
		issuerMode: (locals.org.json?.issuer?.type === 'transactionService'
			? 'transactionService'
			: 'local') as IssuerMode
	};
};

// Values an owner may pick on the claim page. ACHIEVEMENT is not offered: it behaves as
// COMMUNITY until it has a policy of its own (claim-visibility ADR, D2).
const OWNER_SETTABLE: Visibility[] = ['PUBLIC', 'COMMUNITY', 'PRIVATE'];

export const actions: Actions = {
	// Change only this claim's visibility. Deliberately separate from `updateClaim`,
	// whose ACCEPTED path rewrites the narrative and evidence from the form.
	setVisibility: async ({ locals, params, request }) => {
		if (!locals.session?.user) error(401, m.fuzzy_brave_otter_guard());

		const claim = await prisma.achievementClaim.findUnique({
			where: { id: params.claimId },
			select: { id: true, userId: true, organizationId: true }
		});
		// Owner-only. Anyone else, admins included, gets the same 404 as a missing claim.
		// A suspended claim's owner may still change it: suspension keeps it hidden anyway.
		if (!claim || claim.organizationId !== locals.org.id || claim.userId !== locals.session.user.id)
			error(404, m.best_sharp_lamb_enchant());

		const raw = (await request.formData()).get('visibility')?.toString();
		if (!isVisibility(raw) || !OWNER_SETTABLE.includes(raw))
			return fail(400, { visibilityInvalid: true });

		await prisma.achievementClaim.update({
			where: { id: claim.id },
			data: { visibility: raw }
		});
		return { visibilityUpdated: true };
	}
};
