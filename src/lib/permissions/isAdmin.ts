export const isAdmin = ({ user }: { user?: App.UserData }): boolean => {
	return ['GENERAL_ADMIN', 'CONTENT_ADMIN'].includes(user?.orgRole || 'none');
};
