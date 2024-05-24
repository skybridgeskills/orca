export const MAX_PAGE_SIZE = 20;

export const PAGE_QUERY_PARAM = 'page';
export const PAGE_SIZE_QUERY_PARAM = 'pageSize';

export interface PaginationData {
	page: number;
	pageSize: number;
	includeCount: boolean;
}

export const calculatePageAndSize = (url: URL): PaginationData => {
	let page: number, pageSize: number, includeCount: boolean;
	try {
		page = Math.max(parseInt(url.searchParams.get(PAGE_QUERY_PARAM) || '1'), 1);
		pageSize = Math.min(
			parseInt(url.searchParams.get(PAGE_SIZE_QUERY_PARAM) || `${MAX_PAGE_SIZE}`),
			MAX_PAGE_SIZE
		);
		includeCount = url.searchParams.get('includeCount') === 'true';
	} catch (_) {
		page = 1;
		pageSize = MAX_PAGE_SIZE;
		includeCount = false;
	}
	return { page, pageSize, includeCount };
};
