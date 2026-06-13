import { redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { canEditAchievements } from '$lib/server/permissions';
import { getSkillLibrary } from '$lib/skills/library';

import type { PageServerLoad } from './$types';

// Onboarding accelerator: an admin-gated picker that creates curated durable-skill
// competencies one-by-one via the existing `/achievements/create` action (no bulk
// endpoint — see ADR 2026-06-11-skill-library-service). The library is plain
// reference data (20 static skills today), so search/filter happens client-side.
export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session?.user?.id) {
		redirect(302, '/achievements');
	}

	const hasPermission = await canEditAchievements({
		user: {
			id: locals.session.user.id,
			orgRole: locals.session.user.orgRole
		},
		org: {
			id: locals.org.id,
			json: locals.org.json
		}
	});

	if (!hasPermission) {
		redirect(302, '/achievements');
	}

	const skills = await getSkillLibrary().list();

	// Existing achievement names (lower-cased) so the picker can mark skills that are
	// already created and disable them — avoids accidental duplicate competencies.
	const existing = await prisma.achievement.findMany({
		where: { organizationId: locals.org.id },
		select: { name: true }
	});
	const existingNames = existing.map((a) => a.name.trim().toLowerCase());

	return { skills, existingNames };
};
