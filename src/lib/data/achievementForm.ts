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
		claimRequires: yup.string().nullable(),
		reviewRequires: yup.string().nullable(),
		reviewsReqired: yup.number().integer().min(0).max(5),
		reviewableSelectedOption: yup.string().oneOf(['none', 'admin', 'badge']),
		capabilities_inviteRequires: yup.string().nullable().transform(emptyNulled).uuid()
	})
	.test('reviewRequires', m.achievementConfig_reviewRequiredCrossValidationMessage(), (value) => {
		if (value.reviewableSelectedOption == 'badge' && !value.reviewRequires) return false;
		return true;
	});
