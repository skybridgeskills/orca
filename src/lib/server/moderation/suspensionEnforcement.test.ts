import type { ReportTargetType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// P5 enforcement helpers: single-target visibility (hidden for non-admins, flagged for
// admins) and the BATCHED list annotation (one prisma query for the whole page — no N+1).

const mockFindMany = vi.hoisted(() => vi.fn());
vi.mock('$lib/../prisma/client', () => ({
	prisma: { moderationAction: { findMany: mockFindMany } }
}));

import { annotateSuspensions, suspensionStateFor } from './suspension';

const ORG = 'org-1';
const ach = (id: string) => ({
	id,
	originOrgId: ORG,
	targetType: 'ACHIEVEMENT' as ReportTargetType,
	targetId: id
});

beforeEach(() => {
	vi.clearAllMocks();
});

describe('suspensionStateFor', () => {
	it('not suspended → visible, not flagged', async () => {
		mockFindMany.mockResolvedValue([]);
		const s = await suspensionStateFor(ach('a1'), false);
		expect(s).toEqual({ suspension: null, suspended: false, hidden: false });
	});

	it('suspended + non-admin → hidden', async () => {
		mockFindMany.mockResolvedValue([{ id: 'm1', tier: 'ORG', createdAt: new Date() }]);
		const s = await suspensionStateFor(ach('a1'), false);
		expect(s.suspended).toBe(true);
		expect(s.hidden).toBe(true);
	});

	it('suspended + admin → flagged but not hidden', async () => {
		mockFindMany.mockResolvedValue([{ id: 'm1', tier: 'SITE', createdAt: new Date() }]);
		const s = await suspensionStateFor(ach('a1'), true);
		expect(s.suspended).toBe(true);
		expect(s.hidden).toBe(false);
		expect(s.suspension?.tier).toBe('SITE');
	});
});

describe('annotateSuspensions (batched — no N+1)', () => {
	it('annotates a list with ONE query and resolves correct visibility', async () => {
		// Only a2 and a4 are suspended.
		mockFindMany.mockResolvedValue([
			{ id: 'm2', tier: 'ORG', createdAt: new Date(), targetType: 'ACHIEVEMENT', targetId: 'a2' },
			{ id: 'm4', tier: 'SITE', createdAt: new Date(), targetType: 'ACHIEVEMENT', targetId: 'a4' }
		]);

		const items = [ach('a1'), ach('a2'), ach('a3'), ach('a4')];
		const annotated = await annotateSuspensions(ORG, items, (a) => ({
			targetType: a.targetType,
			targetId: a.targetId
		}));

		// EXACTLY one DB call for the whole page.
		expect(mockFindMany).toHaveBeenCalledTimes(1);

		const byId = Object.fromEntries(annotated.map((r) => [r.item.id, r]));
		expect(byId['a1'].suspended).toBe(false);
		expect(byId['a2'].suspended).toBe(true);
		expect(byId['a3'].suspended).toBe(false);
		expect(byId['a4'].suspended).toBe(true);
		expect(byId['a4'].suspension?.tier).toBe('SITE');

		// Non-admin filter drops suspended rows; admin keeps all.
		const nonAdminVisible = annotated.filter((r) => !r.suspended).map((r) => r.item.id);
		expect(nonAdminVisible).toEqual(['a1', 'a3']);
		expect(annotated.length).toBe(4); // admin sees all four (flagged)
	});

	it('empty input makes no query', async () => {
		const annotated = await annotateSuspensions(ORG, [], () => ({
			targetType: 'ACHIEVEMENT',
			targetId: 'x'
		}));
		expect(annotated).toEqual([]);
		expect(mockFindMany).not.toHaveBeenCalled();
	});
});
