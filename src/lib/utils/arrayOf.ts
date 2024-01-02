export const arrayOf = (item: any): Array<any> => {
	if (Array.isArray(item)) return item;
	return [item];
};
