import * as yup from 'yup';

import * as m from '$lib/i18n/messages';

import { alignmentsArraySchema } from './alignment';

const emptyNulled = (value: string | null) => (value === '' ? null : value);

// "This badge" sentinel: the form submits this literal for a review/invite requirement
// that targets the badge being created/edited; the server resolves it to the badge's
// own id (the new UUID at create, `params.id` at edit). See the
// 2026-06-11-this-badge-requirement-option plan.
export const SELF_REQUIREMENT = 'self';

/** Resolve the "this badge" sentinel to the achievement's own id; passthrough otherwise. */
export const resolveSelfRequirement = (
	value: string | null | undefined,
	selfId: string
): string | null => {
	if (!value) return null;
	return value === SELF_REQUIREMENT ? selfId : value;
};

export const achievementFormSchema = yup
	.object()
	.shape({
		name: yup.string().required(),
		description: yup.string().required(),
		criteriaId: yup.string().url('A complete valid URL is required if provided.').nullable(),
		criteriaNarrative: yup.string().nullable(),

		claimable: yup.string().oneOf(['on', 'off']),
		claimableSelectedOption: yup.string().oneOf(['off', 'badge', 'public']),
		claimRequires: yup.string().nullable(),
		reviewRequires: yup.string().nullable(),
		reviewsReqired: yup.number().integer().min(0).max(5),
		reviewableSelectedOption: yup.string().oneOf(['none', 'admin', 'badge']),
		inviteSelectedOption: yup.string().oneOf(['none', 'badge']),

		capabilities_inviteRequires: yup
			.string()
			.nullable()
			.transform(emptyNulled)
			.test(
				'uuid-or-self',
				'capabilities_inviteRequires must be a UUID or the "self" sentinel',
				(v) => v == null || v === SELF_REQUIREMENT || yup.string().uuid().isValidSync(v)
			),

		alignments: alignmentsArraySchema.optional().default([])
	})
	.test(
		'claimRequires',
		m.gentle_brave_falcon_claimcross(),
		(value) => !(value.claimableSelectedOption == 'badge' && !value.claimRequires)
	)
	.test(
		'reviewRequires',
		m.bright_swift_eagle_crossval(),
		(value) => !(value.reviewableSelectedOption == 'badge' && !value.reviewRequires)
	)
	.test(
		'inviteRequires',
		m.fresh_bright_sparrow_invitecross(),
		(value) => !(value.inviteSelectedOption == 'badge' && !value.capabilities_inviteRequires)
	);
