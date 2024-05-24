/**
 * Get the best match for the request's Accept header between text/html and application/json.
 * Naive implementation that just checks if text/html is in the Accept header.
 */
export const prefersHtml = (req: Request): boolean => {
	var accept = req.headers.get('Accept') ?? '';
	const acceptPieces = accept.split(',');
	const isHtml = acceptPieces.includes('text/html');

	if (isHtml) true;
	return false;
};
