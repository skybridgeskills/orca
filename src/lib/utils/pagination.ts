export const MAX_PAGE_SIZE = 20;

export const PAGE_QUERY_PARAM = 'page';
export const PAGE_SIZE_QUERY_PARAM = 'pageSize';

export const calculatePageAndSize = (url: URL) => {
	let page, pageSize;
	try {
		page = Math.max(parseInt(url.searchParams.get(PAGE_QUERY_PARAM) || '1'), 1);
		pageSize = Math.min(
			parseInt(url.searchParams.get(PAGE_SIZE_QUERY_PARAM) || `${MAX_PAGE_SIZE}`),
			MAX_PAGE_SIZE
		);
	} catch (_) {
		page = 1;
		pageSize = MAX_PAGE_SIZE;
	}
	return { page, pageSize };
};
