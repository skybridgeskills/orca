import { Prisma } from '@prisma/client';
import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from 'yup';

import { prisma } from '$lib/../prisma/client';
import { getAchievement } from '$lib/data/achievement';
import {
	achievementFormSchema,
	resolveSelfRequirement,
	SELF_REQUIREMENT
} from '$lib/data/achievementForm';
import type { Alignment } from '$lib/data/alignment';
import { diffAndApplyRubric, parseRubricFromFormData } from '$lib/data/resultDescription';
import * as m from '$lib/i18n/messages';
import { getUploadUrl } from '$lib/server/media';
import { canEditAchievements } from '$lib/server/permissions';
import stripTags from '$lib/utils/stripTags';

import type { PageServerLoad } from './$types';

dotenv.config();

function parseAlignmentsFromFormData(formData: FormData): Alignment[] {
	const alignments: Alignment[] = [];
	let index = 0;

	while (formData.has(`alignment[${index}].targetUrl`)) {
		const targetUrl = formData.get(`alignment[${index}].targetUrl`)?.toString().trim();
		const targetName = formData.get(`alignment[${index}].targetName`)?.toString().trim();
		const targetDescription = formData
			.get(`alignment[${index}].targetDescription`)
			?.toString()
			.trim();
		const targetCode = formData.get(`alignment[${index}].targetCode`)?.toString().trim();

		if (targetUrl && targetName) {
			const alignment: Alignment = {
				targetUrl: stripTags(targetUrl),
				targetName: stripTags(targetName)
			};

			if (targetDescription) {
				alignment.targetDescription = stripTags(targetDescription);
			}

			if (targetCode) {
				alignment.targetCode = stripTags(targetCode);
			}

			alignments.push(alignment);
		}

		index++;
	}

	return alignments;
}

export const load: PageServerLoad = async ({ locals }) => {
	// redirect user if logged out or doesn't have permission to create achievements
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

	const categories = await prisma.achievementCategory.findMany({
		where: {
			organizationId: locals.org.id
		},
		orderBy: {
			weight: 'desc'
		}
	});

	const members = await prisma.user.findMany({
		where: { organizationId: locals.org.id },
		select: { id: true, givenName: true, familyName: true },
		orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }]
	});

	return {
		organization: locals.org,
		categories: categories,
		members
	};
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (!locals.session?.user?.id) {
			error(403, m.lower_home_cow_view());
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
			error(403, m.lower_home_cow_view());
		}

		const newIdentifier = uuidv4();
		const requestData = await request.formData();
		const rawAlignments = parseAlignmentsFromFormData(requestData);
		const imageKey = requestData.get('imageExtension')
			? `achievement-${newIdentifier}/raw-image.${requestData.get('imageExtension')}`
			: null;

		const claimTemplate_enabled =
			(requestData.get('claimTemplate_enabled')?.toString() || 'off') === 'on';

		const rawClaimTemplate = stripTags(requestData.get('claimTemplate')?.toString() || '');
		const formData = {
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),
			category: stripTags(requestData.get('category')?.toString()),

			claimable: requestData.get('claimable')?.toString(), // 'on' or 'off'
			claimableSelectedOption: requestData.get('claimableSelectedOption')?.toString(), // 'off', 'badge', or 'public'
			claimRequires: requestData.get('claimRequires')?.toString(),
			reviewRequires: requestData.get('reviewRequires')?.toString(),
			reviewsRequired: parseInt(requestData.get('reviewsRequired')?.toString() || '') || 0,
			reviewableSelectedOption: requestData.get('reviewableSelectedOption')?.toString() || 'none',
			capabilities_inviteRequires:
				requestData.get('capabilities_inviteRequires')?.toString() || null,
			claimTemplate: claimTemplate_enabled ? rawClaimTemplate : '',
			alignments: rawAlignments
		};

		try {
			await achievementFormSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) error(400, err.message);
		}

		if (
			formData.capabilities_inviteRequires &&
			formData.capabilities_inviteRequires !== SELF_REQUIREMENT
		) {
			try {
				await getAchievement(formData.capabilities_inviteRequires, locals.org.id);
			} catch {
				return fail(400, {
					code: 'inviteRequires',
					message: m.swift_steady_falcon_notfound()
				});
			}
		}

		// "Reviewed by an admin requires only one review, no matter what."
		const reviewsRequired =
			formData.reviewableSelectedOption == 'admin' ? 1 : formData.reviewsRequired;

		// Stewards (additive overlay): persisted only when review is required, and
		// filtered to current org members (non-member IDs from a tampered request are
		// dropped). Does not affect reviewsRequired / reviewRequires.
		const requestedStewards = [
			...new Set(requestData.getAll('stewards').map(String).filter(Boolean))
		];
		const stewardMembers = requestedStewards.length
			? await prisma.user.findMany({
					where: { organizationId: locals.org.id, id: { in: requestedStewards } },
					select: { id: true }
				})
			: [];
		const stewards =
			formData.reviewableSelectedOption !== 'none' && stewardMembers.length
				? stewardMembers.map((u) => u.id)
				: undefined;

		// Rubric: parse the submitted result descriptions and mint ids (no existing
		// rubric on create).
		const submittedRubric = parseRubricFromFormData(requestData).map((rd) => ({
			...rd,
			name: stripTags(rd.name),
			allowedValue: rd.allowedValue.map((v) => stripTags(v))
		}));
		const resultDescriptions = diffAndApplyRubric(submittedRubric, []);

		const achievementData = {
			id: newIdentifier,
			identifier: `urn:uuid:${newIdentifier}`,
			name: formData.name,
			// Scalar FKs (unchecked input) so the "This badge" review requirement can be a
			// self-reference at create time — the row does not exist yet, so a nested
			// `connect` is impossible, but a self-referencing FK is valid within a single-row
			// INSERT. `resolveSelfRequirement` maps the 'self' sentinel to the new id.
			organizationId: locals.org.id,
			description: formData.description,
			criteriaId: formData.criteriaId,
			criteriaNarrative: formData.criteriaNarrative,
			image: imageKey,
			claimable: formData.claimable == 'on',
			claimRequiresId:
				formData.claimable == 'on' && formData.claimRequires ? formData.claimRequires : undefined,
			reviewRequiresId: resolveSelfRequirement(formData.reviewRequires, newIdentifier) ?? undefined,
			json: {
				...(formData.alignments.length > 0 ? { alignment: formData.alignments } : {}),
				capabilities: {
					inviteRequires: resolveSelfRequirement(
						formData.capabilities_inviteRequires,
						newIdentifier
					)
				},
				claimTemplate: formData.claimTemplate,
				reviewsRequired,
				...(stewards ? { stewards } : {}),
				...(resultDescriptions.length ? { resultDescriptions } : {})
			} as unknown as Prisma.InputJsonObject,
			categoryId: formData.category != 'uncategorized' ? formData.category : undefined
		};

		if (
			formData.capabilities_inviteRequires &&
			formData.capabilities_inviteRequires !== SELF_REQUIREMENT
		) {
			const inviteRequiresAchievement = await prisma.achievement.findFirst({
				where: {
					organizationId: locals.org.id,
					id: formData.capabilities_inviteRequires
				}
			});
			if (!inviteRequiresAchievement) {
				error(400, m.sharp_quiet_panther_invitereq());
			}
		}

		const achievement = await prisma.achievement.create({
			data: achievementData,
			include: {
				category: true,
				claimRequires: true,
				reviewRequires: true
			}
		});

		const imageUploadUrl = imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement,
			imageUploadUrl
		};
	}
};
