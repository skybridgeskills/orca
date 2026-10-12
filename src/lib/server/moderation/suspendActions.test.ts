import type { ReportTargetType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// P5 suspend/lift orchestration: ORG vs SITE tier assignment, idempotency (no stacking),
// and lift-authority (an ORG actor cannot lift a SITE suspension; a SITE actor can lift
// either). Prisma + the superadmin-org env are mocked.

const mockEnv = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv.value }));

const mockFindMany = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());
const mockUpdate = vi.hoisted(() => vi.fn());
vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		moderationAction: { findMany: mockFindMany, create: mockCreate, update: mockUpdate }
	}
}));

import { actorTierFor, liftTarget, suspendTarget } from './suspendActions';

const SUPER_ORG = 'super-org';
const ORG_A = 'org-a';

const target = (originOrgId = ORG_A) => ({
	originOrgId,
	targetType: 'ACHIEVEMENT' as ReportTargetType,
	targetId: 'ach-1'
});

beforeEach(() => {
	vi.clearAllMocks();
	for (const k of Object.keys(mockEnv.value)) delete mockEnv.value[k];
	mockFindMany.mockResolvedValue([]); // no active suspension by default
	mockCreate.mockResolvedValue({ id: 'action-new' });
	mockUpdate.mockResolvedValue({});
});

describe('actorTierFor', () => {
	it('is ORG when not the superadmin org', () => {
		expect(actorTierFor(ORG_A)).toBe('ORG');
	});
	it('is SITE only for the configured superadmin org', () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		expect(actorTierFor(SUPER_ORG)).toBe('SITE');
		expect(actorTierFor(ORG_A)).toBe('ORG');
	});
});

describe('suspendTarget — tier assignment', () => {
	it('an org admin suspending own-org content writes tier ORG', async () => {
		const res = await suspendTarget({
			target: target(ORG_A),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toMatchObject({ ok: true, status: 'created', tier: 'ORG' });
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ tier: 'ORG', originOrgId: ORG_A, action: 'SUSPEND' })
			})
		);
	});

	it('a superadmin suspending cross-org content writes tier SITE', async () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		const res = await suspendTarget({
			target: target(ORG_A), // origin is org-a; actor is the superadmin org
			actorUserId: 'super-1',
			actorOrgId: SUPER_ORG
		});
		expect(res).toMatchObject({ ok: true, status: 'created', tier: 'SITE' });
		expect(mockCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ tier: 'SITE', originOrgId: ORG_A })
			})
		);
	});

	it('rejects an org admin suspending another org (cross-org forbidden)', async () => {
		const res = await suspendTarget({
			target: target('other-org'),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toEqual({ ok: false, reason: 'cross-org-forbidden' });
		expect(mockCreate).not.toHaveBeenCalled();
	});
});

describe('suspendTarget — idempotency', () => {
	it('no-ops when a same-tier suspension is already active', async () => {
		mockFindMany.mockResolvedValue([{ id: 'a1', tier: 'ORG', createdAt: new Date() }]);
		const res = await suspendTarget({
			target: target(ORG_A),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toMatchObject({ ok: true, status: 'noop', reason: 'already-suspended' });
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('no-ops a SITE suspend when a SITE suspension is already active', async () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		mockFindMany.mockResolvedValue([{ id: 's1', tier: 'SITE', createdAt: new Date() }]);
		const res = await suspendTarget({
			target: target(ORG_A),
			actorUserId: 'super-1',
			actorOrgId: SUPER_ORG
		});
		expect(res).toMatchObject({ ok: true, status: 'noop' });
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('a SITE suspend supersedes an active ORG suspension (creates a SITE row)', async () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		mockFindMany.mockResolvedValue([{ id: 'o1', tier: 'ORG', createdAt: new Date() }]);
		const res = await suspendTarget({
			target: target(ORG_A),
			actorUserId: 'super-1',
			actorOrgId: SUPER_ORG
		});
		expect(res).toMatchObject({ ok: true, status: 'created', tier: 'SITE' });
		expect(mockCreate).toHaveBeenCalled();
	});
});

describe('liftTarget — authority', () => {
	it('an org admin CAN lift an ORG suspension', async () => {
		mockFindMany.mockResolvedValue([{ id: 'o1', tier: 'ORG', createdAt: new Date() }]);
		const res = await liftTarget({
			target: target(ORG_A),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toMatchObject({ ok: true, status: 'lifted' });
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'o1' },
				data: expect.objectContaining({ liftedByUserId: 'admin-a', liftedTier: 'ORG' })
			})
		);
	});

	it('an org admin CANNOT lift a SITE suspension (rejected, no update)', async () => {
		mockFindMany.mockResolvedValue([{ id: 's1', tier: 'SITE', createdAt: new Date() }]);
		const res = await liftTarget({
			target: target(ORG_A),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toEqual({ ok: false, reason: 'insufficient-tier', suspensionTier: 'SITE' });
		expect(mockUpdate).not.toHaveBeenCalled();
	});

	it('a superadmin can lift an ORG suspension', async () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		mockFindMany.mockResolvedValue([{ id: 'o1', tier: 'ORG', createdAt: new Date() }]);
		const res = await liftTarget({
			target: target(ORG_A),
			actorUserId: 'super-1',
			actorOrgId: SUPER_ORG
		});
		expect(res).toMatchObject({ ok: true, status: 'lifted' });
		expect(mockUpdate).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ liftedTier: 'SITE' }) })
		);
	});

	it('a superadmin can lift a SITE suspension', async () => {
		mockEnv.value.SUPERADMIN_ORG_ID = SUPER_ORG;
		mockFindMany.mockResolvedValue([{ id: 's1', tier: 'SITE', createdAt: new Date() }]);
		const res = await liftTarget({
			target: target(ORG_A),
			actorUserId: 'super-1',
			actorOrgId: SUPER_ORG
		});
		expect(res).toMatchObject({ ok: true, status: 'lifted' });
	});

	it('no-ops when nothing is suspended', async () => {
		mockFindMany.mockResolvedValue([]);
		const res = await liftTarget({
			target: target(ORG_A),
			actorUserId: 'admin-a',
			actorOrgId: ORG_A
		});
		expect(res).toMatchObject({ ok: true, status: 'noop', reason: 'not-suspended' });
		expect(mockUpdate).not.toHaveBeenCalled();
	});
});
