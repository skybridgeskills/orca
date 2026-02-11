import * as yup from 'yup';
import * as m from '$lib/i18n/messages';

const emptyNulled = (value: string | null) => (value === '' ? null : value);

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

		capabilities_inviteRequires: yup.string().nullable().transform(emptyNulled).uuid()
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
