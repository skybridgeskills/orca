import { describe, it, expect } from 'vitest';

import { buildLinkHeader, getCredentialsResponseBody } from './getCredentialsResponse';

const BASE = 'https://example.test/ims/ob/v3p0/credentials';

describe('buildLinkHeader', () => {
	it('omits prev on the first page and includes next when more remain', () => {
		const header = buildLinkHeader({ baseUrl: BASE, limit: 10, offset: 0, total: 25 });
		expect(header).toContain(`<${BASE}?limit=10&offset=0>; rel="first"`);
		expect(header).not.toContain('rel="prev"');
		expect(header).toContain(`<${BASE}?limit=10&offset=10>; rel="next"`);
		expect(header).toContain(`<${BASE}?limit=10&offset=20>; rel="last"`);
	});

	it('includes prev and next on a middle page', () => {
		const header = buildLinkHeader({ baseUrl: BASE, limit: 10, offset: 10, total: 25 });
		expect(header).toContain(`<${BASE}?limit=10&offset=0>; rel="prev"`);
		expect(header).toContain(`<${BASE}?limit=10&offset=20>; rel="next"`);
	});

	it('omits next on the last page', () => {
		const header = buildLinkHeader({ baseUrl: BASE, limit: 10, offset: 20, total: 25 });
		expect(header).toContain(`<${BASE}?limit=10&offset=10>; rel="prev"`);
		expect(header).not.toContain('rel="next"');
		expect(header).toContain(`<${BASE}?limit=10&offset=20>; rel="last"`);
	});

	it('handles an empty result set (first === last === offset 0, no prev/next)', () => {
		const header = buildLinkHeader({ baseUrl: BASE, limit: 50, offset: 0, total: 0 });
		expect(header).toContain(`<${BASE}?limit=50&offset=0>; rel="first"`);
		expect(header).toContain(`<${BASE}?limit=50&offset=0>; rel="last"`);
		expect(header).not.toContain('rel="prev"');
		expect(header).not.toContain('rel="next"');
	});

	it('computes the last-page offset as the largest full-page boundary', () => {
		// total=30, limit=10 → pages at 0,10,20 → last=20.
		expect(buildLinkHeader({ baseUrl: BASE, limit: 10, offset: 0, total: 30 })).toContain(
			`<${BASE}?limit=10&offset=20>; rel="last"`
		);
		// total=31 → last=30.
		expect(buildLinkHeader({ baseUrl: BASE, limit: 10, offset: 0, total: 31 })).toContain(
			`<${BASE}?limit=10&offset=30>; rel="last"`
		);
	});
});

describe('getCredentialsResponseBody', () => {
	it('wraps the stored credential JSON under `credential`', () => {
		const creds = [{ id: 'urn:a' }, { id: 'urn:b' }];
		expect(getCredentialsResponseBody(creds)).toEqual({ credential: creds });
	});

	it('returns an empty array when there are no credentials', () => {
		expect(getCredentialsResponseBody([])).toEqual({ credential: [] });
	});
});
