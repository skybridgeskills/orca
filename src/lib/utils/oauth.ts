/**
 *
 * @param error OAuth family error code like 'invalid_request'
 * @param description Human readable text description of the error used for debugging
 */
export const oAuthError = (error: string, description: string) => {
	return {
		error,
		error_description: description
	};
};
