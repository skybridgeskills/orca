import { arrayOf } from '$lib/utils/arrayOf';
import type { PaginationData } from './pagination';
import { error, json } from '@sveltejs/kit';

type ApiMetaInput = PaginationData & {
	type: string;
	totalCount?: number;
	totalPages?: number;
	getTotalCount?: () => Promise<number>;
};
type ApiInput<T> = {
	data: T | T[];
	meta: ApiMetaInput;
};
type ApiInputWithParams<T> = ApiInput<T> & {
	params: Record<string, string>;
};

interface V1ApiMeta {
	type: string;
	page: number;
	pageSize: number;
	totalPages?: number;
	totalCount?: number;
}
type V1ApiEnvelope<T> = {
	data: T[];
	meta: V1ApiMeta;
};

type V1ApiFunction<T> = (d: ApiInput<T>) => Promise<V1ApiEnvelope<T>>;
type ApiFunction<T> = (d: ApiInputWithParams<T>) => Promise<Response>;

/**
 * Augments V1 envelope with total pagecount
 */
const v1: V1ApiFunction<Partial<{ id: string }>> = async ({ data, meta }) => {
	const result = arrayOf(data);

	return {
		data: result,
		meta: await v1MetaWithRequestedCounts(result.length, meta)
	};
};

/**
 * Lazy loads total count if requested
 */
const v1MetaWithRequestedCounts = async (
	currentResultCount: number,
	meta: ApiMetaInput
): Promise<V1ApiMeta> => {
	const base = {
		type: meta.type,
		page: meta.page,
		pageSize: meta.pageSize
	};
	if (!meta.includeCount) return base;

	if (currentResultCount === 0 && meta.page === 1)
		return {
			...base,
			totalCount: 0,
			totalPages: 1
		};

	if (meta.totalCount)
		return {
			...base,
			totalCount: meta.totalCount,
			totalPages: Math.ceil(meta.totalCount / meta.pageSize)
		};

	if (meta.getTotalCount) {
		const totalCount = await meta.getTotalCount();
		return {
			...base,
			totalCount,
			totalPages: Math.ceil(totalCount / meta.pageSize)
		};
	}

	// Fallback: could not get requested counts.
	return base;
};

/**
 * Returns API Response for the desired API version
 */
export const apiResponse: ApiFunction<Partial<{ id: string }>> = async ({ params, data, meta }) => {
	if (params.version === 'v1') return json(await v1({ data, meta }));
	throw error(500, 'Unsupported API version');
};
