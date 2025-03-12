import * as yup from 'yup';

export const formSchema = yup.object().shape({
	name: yup.string().required(),
	description: yup.string().required(),
	url: yup.string().url('A complete valid URL is required.').nullable(),
	primaryColor: yup
		.string()
		.matches(/^#[0-9a-f]{6}$/i, 'A valid hex color is required.')
		.nullable(),
	logo: yup
		.string()
		.matches(/\.(svg|png)$/)
		.nullable(),
	tagline: yup.string().nullable()
});
