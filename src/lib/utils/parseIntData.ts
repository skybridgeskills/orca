const parseIntData = (i: string, defaultValue: number = 1000): number => {
	const parsed = parseInt(i);
	if (isNaN(parsed)) return defaultValue;
	return parsed;
};

export default parseIntData;
