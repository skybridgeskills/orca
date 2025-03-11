export const validateEmailAddress = (email: string): boolean => {
	const atSymbol = email.indexOf('@');
	const dot = email.lastIndexOf('.');
	return atSymbol > 0 && dot > atSymbol && dot < email.length - 1;
};
