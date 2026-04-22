import * as yup from 'yup';

export const setIssuerSchema = yup.object({
	type: yup.string().oneOf(['signingKey', 'transactionService']).required(),
	signingKeyId: yup.string().when('type', {
		is: 'signingKey',
		then: (s) => s.required('signingKeyId is required when type is signingKey'),
		otherwise: (s) => s.notRequired()
	})
});

export const setTransactionServiceSchema = yup.object({
	url: yup
		.string()
		.matches(/^https?:\/\/.+/, 'URL must start with http:// or https://')
		.required(),
	tenantName: yup.string().matches(/^\S+$/, 'tenantName cannot contain whitespace').required(),
	apiKey: yup.string().notRequired() // blank means "keep existing"
});

export const removeApiKeySchema = yup.object({});
