import { beforeEach, describe, expect, it, vi } from 'vitest';

// P1: moderation primitives — superadmin-org guard (fail-closed), reporter-status
// snapshot computation, and suspension tier authority. IO boundaries mocked.

const mockMember = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/permissions', () => ({ isMember: mockMember }));

const mockEnv = vi.hoisted(() => ({ value: {} as Record<string, string | undefined> }));
vi.mock('$env/dynamic/private', () => ({ env: mockEnv.value }));

import { computeReporterStatus } from './reporterStatus';
import { isSuperadminOrg, requireSuperadminOrg, superadminOrgId } from './superadminOrg';
import { canLift, tierRank } from './suspension';

beforeEach(() => {
	vi.clearAllMocks();
	for (const k of Object.keys(mockEnv.value)) delete mockEnv.value[k];
});

describe('superadminOrg (fail closed)', () => {
	it('superadminOrgId is null when env unset', () => {
		expect(superadminOrgId()).toBeNull();
		expect(isSuperadminOrg('any')).toBe(false);
	});

	it('matches only the configured org id', () => {
		mockEnv.value.SUPERADMIN_ORG_ID = ' super-org ';
		expect(superadminOrgId()).toBe('super-org');
		expect(isSuperadminOrg('super-org')).toBe(true);
		expect(isSuperadminOrg('other')).toBe(false);
		expect(isSuperadminOrg(null)).toBe(false);
	});

	const locals = (orgId: string, userId?: string) =>
		({ org: { id: orgId }, session: userId ? { user: { id: userId } } : null }) as App.Locals;

	it('requireSuperadminOrg throws when env unset (fail closed)', () => {
		expect(() => requireSuperadminOrg(locals('super-org', 'u1'))).toThrow();
	});

	it('requireSuperadminOrg throws for a non-superadmin org or no user', () => {
		mockEnv.value.SUPERADMIN_ORG_ID = 'super-org';
		expect(() => requireSuperadminOrg(locals('other-org', 'u1'))).toThrow();
		expect(() => requireSuperadminOrg(locals('super-org', undefined))).toThrow();
	});

	it('requireSuperadminOrg passes for a logged-in user in the superadmin org', () => {
		mockEnv.value.SUPERADMIN_ORG_ID = 'super-org';
		expect(() => requireSuperadminOrg(locals('super-org', 'u1'))).not.toThrow();
	});
});

describe('computeReporterStatus', () => {
	const org = { id: 'org-1', json: {} as App.OrganizationConfig };

	it('ANONYMOUS with no session', async () => {
		expect(await computeReporterStatus({ session: null, org })).toBe('ANONYMOUS');
		expect(mockMember).not.toHaveBeenCalled();
	});

	it('ADMIN for an admin role without a membership lookup', async () => {
		const session = { user: { id: 'u1', orgRole: 'CONTENT_ADMIN' } } as App.SessionData;
		expect(await computeReporterStatus({ session, org })).toBe('ADMIN');
		expect(mockMember).not.toHaveBeenCalled();
	});

	it('MEMBER when isMember is true', async () => {
		mockMember.mockResolvedValue(true);
		const session = { user: { id: 'u1', orgRole: null } } as App.SessionData;
		expect(await computeReporterStatus({ session, org })).toBe('MEMBER');
	});

	it('USER when logged in but not a member', async () => {
		mockMember.mockResolvedValue(false);
		const session = { user: { id: 'u1', orgRole: null } } as App.SessionData;
		expect(await computeReporterStatus({ session, org })).toBe('USER');
	});
});

describe('suspension tier authority', () => {
	it('SITE outranks ORG', () => {
		expect(tierRank('SITE')).toBeGreaterThan(tierRank('ORG'));
	});

	it('an ORG actor cannot lift a SITE suspension; a SITE actor can lift either', () => {
		expect(canLift('ORG', 'ORG')).toBe(true);
		expect(canLift('ORG', 'SITE')).toBe(false);
		expect(canLift('SITE', 'ORG')).toBe(true);
		expect(canLift('SITE', 'SITE')).toBe(true);
	});
});
