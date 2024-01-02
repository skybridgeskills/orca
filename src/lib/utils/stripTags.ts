import sanitizeHtml from 'sanitize-html';

const stripTags = (dirty?: string): string => {
	if (!dirty) return '';

	return sanitizeHtml(dirty, {
		allowedTags: [],
		allowedAttributes: {}
	});
};

export default stripTags;
