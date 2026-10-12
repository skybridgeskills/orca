import { describe, expect, it } from 'vitest';

import { apiResponse } from './api';

const baseMeta = { type: 'ClaimEndorsement', page: 1, pageSize: 1, includeCount: false };

describe('apiResponse v1 envelope', () => {
	it('includes meta.award when given', async () => {
		const award = { created: false, invited: true, claimId: null, endorsementId: 'end-1' };
		const res = await apiResponse({
			params: { version: 'v1' },
			data: [{ id: 'end-1' }],
			meta: { ...baseMeta, award }
		});
		const body = await res.json();
		expect(body.data).toEqual([{ id: 'end-1' }]);
		expect(body.meta).toEqual({ type: 'ClaimEndorsement', page: 1, pageSize: 1, award });
	});

	it('omits meta.award when not given', async () => {
		const res = await apiResponse({
			params: { version: 'v1' },
			data: [{ id: 'end-1' }],
			meta: baseMeta
		});
		const body = await res.json();
		expect(body.meta).toEqual({ type: 'ClaimEndorsement', page: 1, pageSize: 1 });
		expect(body.meta).not.toHaveProperty('award');
	});

	it('keeps meta.award alongside requested counts', async () => {
		const award = { created: true, invited: false };
		const res = await apiResponse({
			params: { version: 'v1' },
			data: [{ id: 'end-1' }],
			meta: { ...baseMeta, includeCount: true, getTotalCount: async () => 1, award }
		});
		const body = await res.json();
		expect(body.meta).toMatchObject({ award, totalCount: 1, totalPages: 1 });
	});
});
