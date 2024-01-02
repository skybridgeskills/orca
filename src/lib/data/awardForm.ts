import * as yup from 'yup';

export const awardFormSchema = yup.object().shape({
	name: yup.string().required(),
	description: yup.string().required(),
	criteriaId: yup.string().url('A complete valid URL is required if provided.').nullable(),
	criteriaNarrative: yup.string().nullable()
});
