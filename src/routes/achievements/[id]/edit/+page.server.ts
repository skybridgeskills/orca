import { Prisma } from '@prisma/client';
import { error, fail, redirect } from '@sveltejs/kit';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from 'yup';

import { getAchievement } from '$lib/data/achievement';
import { achievementFormSchema } from '$lib/data/achievementForm';
import type { Alignment } from '$lib/data/alignment';
import * as m from '$lib/i18n/messages';
import { getUploadUrl } from '$lib/server/media';
import { canEditAchievements } from '$lib/server/permissions';

import stripTags from '../../../../lib/utils/stripTags';
import { prisma } from '../../../../prisma/client';

import type { Actions } from './$types';

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

export const load = async ({ locals, params }) => {
	// redirect user if logged out or doesn't have permission to edit achievements
	if (!locals.session?.user?.id) {
		redirect(302, `/achievements/${params.id}`);
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
		redirect(302, `/achievements/${params.id}`);
	}

	const achievement = (await prisma.achievement.findFirstOrThrow({
		where: {
			id: params.id,
			organizationId: locals.org.id
		}
	})) as unknown as App.AchievementWithJson;

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
		achievement: achievement,
		categories: categories,
		members
	};
};

export const actions: Actions = {
	default: async ({ locals, request, params }) => {
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

		const requestData = await request.formData();
		const rawAlignments = parseAlignmentsFromFormData(requestData);
		const existingAchievementRow = await prisma.achievement.findFirst({
			where: {
				id: params.id,
				organizationId: locals.org.id
			},
			select: { json: true }
		});
		const achievementJsonBaseline =
			existingAchievementRow?.json != null &&
			typeof existingAchievementRow.json === 'object' &&
			!Array.isArray(existingAchievementRow.json)
				? (existingAchievementRow.json as Prisma.JsonObject)
				: {};
		const imageUpdated = requestData.get('imageEdited') === 'true';
		const imageKey = requestData.get('imageExtension')
			? `achievement-${params.id}/${uuidv4().slice(-8)}-raw-image.${requestData.get(
					'imageExtension'
				)}`
			: null;

		const formData = {
			// Properties for Achievement
			name: stripTags(requestData.get('name')?.toString()) || '',
			description: stripTags(requestData.get('description')?.toString()) || '',
			criteriaId: requestData.get('url')?.toString(),
			criteriaNarrative: stripTags(requestData.get('criteriaNarrative')?.toString()),

			category: stripTags(requestData.get('category')?.toString()),

			// Properties for AchievmentConfig
			capabilities_inviteRequires:
				requestData.get('capabilities_inviteRequires')?.toString() || null,
			claimable: requestData.get('claimable')?.toString(), // 'on' or 'off'
			claimableSelectedOption: requestData.get('claimableSelectedOption')?.toString(), // 'off', 'badge', or 'public'
			claimRequires: requestData.get('claimRequires')?.toString(),
			reviewRequires: requestData.get('reviewRequires')?.toString(),
			reviewsRequired: parseInt(requestData.get('reviewsRequired')?.toString() || '') || 0,
			reviewableSelectedOption: requestData.get('reviewableSelectedOption')?.toString() || 'none',
			alignments: rawAlignments
		};

		// read claim template enabled flag and claimTemplate value
		const claimTemplate_enabled =
			(requestData.get('claimTemplate_enabled')?.toString() || 'off') === 'on';
		const rawClaimTemplate = stripTags(requestData.get('claimTemplate')?.toString() || '');
		const claimTemplate = claimTemplate_enabled ? rawClaimTemplate : '';
		const claimable = formData.claimable == 'on';

		// claimRequires: only when claimable, the 'badge' option is selected, and a
		// prerequisite badge was chosen.
		let claimRequires: { connect: { id: string } } | undefined =
			claimable && formData.claimableSelectedOption == 'badge' && !!formData.claimRequires
				? { connect: { id: formData.claimRequires } }
				: undefined;

		// reviewRequires: decided on the form's reviewsRequired (before the admin
		// override below), matching the pre-merge ordering.
		let reviewRequires: { connect: { id: string } } | undefined;
		if (formData.reviewsRequired > 0 && !!formData.reviewRequires)
			reviewRequires = { connect: { id: formData.reviewRequires || '' } };
		else if (formData.reviewsRequired == 0) reviewRequires = undefined;

		if (formData.capabilities_inviteRequires) {
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

		// Stewards (additive overlay): persisted only when review is required, filtered
		// to current org members (non-member IDs from a tampered request are dropped).
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

		try {
			await achievementFormSchema.validate(formData);
		} catch (err) {
			if (err instanceof ValidationError) return fail(400, { message: err.message });
		}

		// If achievement is not claimable, don't allow claimRequires to be set to anything.
		if (!claimable && !!claimRequires?.connect.id) claimRequires = undefined;

		// Merge the flattened config json (capabilities, claimTemplate, reviewsRequired)
		// into the achievement json alongside the pre-existing keys (e.g. alignment).
		const mergedAchievementJson = { ...achievementJsonBaseline } as Record<string, unknown>;
		delete mergedAchievementJson.alignments;
		if (formData.alignments.length > 0) {
			mergedAchievementJson.alignment = formData.alignments;
		} else {
			delete mergedAchievementJson.alignment;
		}
		mergedAchievementJson.capabilities = {
			inviteRequires: formData.capabilities_inviteRequires
		};
		mergedAchievementJson.claimTemplate = claimTemplate;
		mergedAchievementJson.reviewsRequired = reviewsRequired;
		if (stewards) {
			mergedAchievementJson.stewards = stewards;
		} else {
			delete mergedAchievementJson.stewards;
		}

		const achievementData = {
			name: formData.name,
			description: formData.description,
			criteriaId: formData.criteriaId,
			criteriaNarrative: formData.criteriaNarrative,
			...(imageUpdated ? { image: imageKey } : null), // Only include the image field value if image is changed.
			category:
				formData.category != 'uncategorized'
					? { connect: { id: formData.category } }
					: { disconnect: true },
			claimable,
			claimRequires: claimRequires ? claimRequires : { disconnect: true },
			reviewRequires: reviewRequires ? reviewRequires : { disconnect: true },
			json: mergedAchievementJson as unknown as Prisma.InputJsonObject
		};

		// Single atomic write (replaces the former config-upsert + achievement-update).
		// A bad claimRequires/reviewRequires connect surfaces as P2025 -> 400.
		const updated = await prisma.achievement
			.update({
				where: {
					id: params.id,
					organizationId: locals.org.id
				},
				include: {
					category: true,
					claimRequires: true,
					reviewRequires: true
				},
				data: achievementData
			})
			.catch((e) => {
				if (e instanceof Prisma.PrismaClientKnownRequestError && e.code == 'P2025') {
					return null;
				}
				error(500, m.fresh_bright_sparrow_saveerror());
			});

		if (!updated) {
			return fail(400, {
				code: 'claimRequires',
				message: m.swift_steady_falcon_notfound()
			});
		}

		const imageUploadUrl = imageUpdated && imageKey ? await getUploadUrl(imageKey) : null;

		return {
			achievement: updated,
			imageUploadUrl
		};
	}
};
