import type { Prisma } from '@prisma/client';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';

export interface BuildLinkHeaderParams {
	/** Absolute URL of the credentials endpoint, no query string. */
	baseUrl: string;
	limit: number;
	offset: number;
	total: number;
}

/**
 * Build an RFC8288 `Link` header for offset-paginated getCredentials results
 * (OB3 §6.2.2). Always emits `first` and `last`; omits `prev` at offset 0 and
 * `next` when the current page reaches the end. Each URL carries the same
 * `limit` with the appropriate `offset`.
 */
export function buildLinkHeader(params: BuildLinkHeaderParams): string {
	const { baseUrl, limit, offset, total } = params;
	const safeLimit = Math.max(1, limit);

	const link = (linkOffset: number, rel: string): string =>
		`<${baseUrl}?limit=${safeLimit}&offset=${Math.max(0, linkOffset)}>; rel="${rel}"`;

	// Offset of the final page: largest multiple of limit strictly less than total
	// (0 when there are no results).
	const lastOffset = total <= 0 ? 0 : Math.floor((total - 1) / safeLimit) * safeLimit;

	const parts: string[] = [link(0, 'first')];
	if (offset > 0) {
		parts.push(link(offset - safeLimit, 'prev'));
	}
	if (offset + safeLimit < total) {
		parts.push(link(offset + safeLimit, 'next'));
	}
	parts.push(link(lastOffset, 'last'));

	return parts.join(', ');
}

/** Absolute base URL for an org's getCredentials endpoint (no query string). */
export function credentialsBaseUrl(org: { domain: string }): string {
	return `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0/credentials`;
}

/**
 * Shape the getCredentials response body (OB3 §6.2.2): the stored signed
 * JSON-LD credential objects under `credential`. No `compactJwsString`.
 */
export function getCredentialsResponseBody(credentials: Prisma.JsonValue[]): {
	credential: Prisma.JsonValue[];
} {
	return { credential: credentials };
}
