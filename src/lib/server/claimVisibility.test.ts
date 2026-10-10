import type { Visibility } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { canViewClaim, claimVisibilityWhere, viewerRole } from './claimVisibility';

const OWNER_ID = 'user-owner';
const OTHER_ID = 'user-other';
const ADMIN_ID = 'user-admin';

const session = (
	userId: string | undefined,
	orgRole?: string
): App.SessionData | null | undefined => {
	if (!userId) return null;
	return {
		id: 'session-1',
		expiresAt: new Date(),
		valid: true,
		user: {
			id: userId,
			givenName: null,
			familyName: null,
			organizationId: 'org-1',
			orgRole: orgRole ?? null,
			identifiers: [],
			defaultVisibility: 'COMMUNITY',
			profileVisibility: 'COMMUNITY',
			json: {}
		}
	} as App.SessionData;
};

const ownerSession = session(OWNER_ID);
const adminSession = session(ADMIN_ID, 'GENERAL_ADMIN');
const contentAdminSession = session(ADMIN_ID, 'CONTENT_ADMIN');
const billingAdminSession = session(OTHER_ID, 'BILLING_ADMIN');
const communitySession = session(OTHER_ID, 'MEMBER');
const communitySessionNoRole = session(OTHER_ID);
const publicSession = null;

const claim = (visibility: Visibility, userId = OWNER_ID) => ({ userId, visibility });

const VISIBILITIES: Visibility[] = ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT', 'PRIVATE'];

// Membership only matters for the community role; owner/admin/public ignore it.
const MEMBER = { viewerIsMember: true };
const NON_MEMBER = { viewerIsMember: false };

describe('viewerRole', () => {
	it('returns public for no session', () => {
		expect(viewerRole({ userId: OWNER_ID }, publicSession)).toBe('public');
	});

	it('returns owner when session user is the claimant', () => {
		expect(viewerRole({ userId: OWNER_ID }, ownerSession)).toBe('owner');
	});

	it('returns admin for GENERAL_ADMIN and CONTENT_ADMIN', () => {
		expect(viewerRole({ userId: OWNER_ID }, adminSession)).toBe('admin');
		expect(viewerRole({ userId: OWNER_ID }, contentAdminSession)).toBe('admin');
	});

	it('does not treat BILLING_ADMIN as admin (falls to community)', () => {
		expect(viewerRole({ userId: OWNER_ID }, billingAdminSession)).toBe('community');
	});

	it('returns community for any other authenticated org user', () => {
		expect(viewerRole({ userId: OWNER_ID }, communitySession)).toBe('community');
		expect(viewerRole({ userId: OWNER_ID }, communitySessionNoRole)).toBe('community');
	});

	it('owner takes precedence over admin role', () => {
		expect(viewerRole({ userId: ADMIN_ID }, adminSession)).toBe('owner');
	});
});

describe('canViewClaim', () => {
	it('owner can view every visibility', () => {
		for (const v of VISIBILITIES) {
			expect(canViewClaim(claim(v), ownerSession, MEMBER)).toBe(true);
		}
	});

	it('admin can view every visibility', () => {
		for (const v of VISIBILITIES) {
			expect(canViewClaim(claim(v), adminSession, MEMBER)).toBe(true);
			expect(canViewClaim(claim(v), contentAdminSession, MEMBER)).toBe(true);
		}
	});

	it('a member can view PUBLIC, COMMUNITY, and ACHIEVEMENT but not PRIVATE', () => {
		expect(canViewClaim(claim('PUBLIC'), communitySession, MEMBER)).toBe(true);
		expect(canViewClaim(claim('COMMUNITY'), communitySession, MEMBER)).toBe(true);
		expect(canViewClaim(claim('ACHIEVEMENT'), communitySession, MEMBER)).toBe(true);
		expect(canViewClaim(claim('PRIVATE'), communitySession, MEMBER)).toBe(false);
	});

	it('BILLING_ADMIN behaves as community (cannot view PRIVATE)', () => {
		expect(canViewClaim(claim('COMMUNITY'), billingAdminSession, MEMBER)).toBe(true);
		expect(canViewClaim(claim('PRIVATE'), billingAdminSession, MEMBER)).toBe(false);
	});

	it('a non-member community viewer can view PUBLIC only', () => {
		expect(canViewClaim(claim('PUBLIC'), communitySession, NON_MEMBER)).toBe(true);
		expect(canViewClaim(claim('COMMUNITY'), communitySession, NON_MEMBER)).toBe(false);
		expect(canViewClaim(claim('ACHIEVEMENT'), communitySession, NON_MEMBER)).toBe(false);
		expect(canViewClaim(claim('PRIVATE'), communitySession, NON_MEMBER)).toBe(false);
	});

	it('owner and admin are unaffected by viewerIsMember: false', () => {
		for (const v of VISIBILITIES) {
			expect(canViewClaim(claim(v), ownerSession, NON_MEMBER)).toBe(true);
			expect(canViewClaim(claim(v), adminSession, NON_MEMBER)).toBe(true);
		}
	});

	it('public can view PUBLIC only', () => {
		expect(canViewClaim(claim('PUBLIC'), publicSession, MEMBER)).toBe(true);
		expect(canViewClaim(claim('COMMUNITY'), publicSession, MEMBER)).toBe(false);
		expect(canViewClaim(claim('ACHIEVEMENT'), publicSession, MEMBER)).toBe(false);
		expect(canViewClaim(claim('PRIVATE'), publicSession, MEMBER)).toBe(false);
	});
});

describe('claimVisibilityWhere', () => {
	it('owner/admin gets no visibility restriction', () => {
		expect(claimVisibilityWhere(adminSession, MEMBER)).toEqual({});
		expect(claimVisibilityWhere(contentAdminSession, MEMBER)).toEqual({});
	});

	it('community ORs in own claims plus community-visible visibilities', () => {
		expect(claimVisibilityWhere(communitySession, MEMBER)).toEqual({
			OR: [{ userId: OTHER_ID }, { visibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }]
		});
	});

	it('BILLING_ADMIN gets the community fragment (own claims OR community-visible)', () => {
		expect(claimVisibilityWhere(billingAdminSession, MEMBER)).toEqual({
			OR: [{ userId: OTHER_ID }, { visibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }]
		});
	});

	it('owner (non-admin, viewing own list) keeps own PRIVATE claims via OR', () => {
		// A plain authenticated user viewing a shared list still sees their own
		// PRIVATE claims because of the userId OR branch.
		const where = claimVisibilityWhere(ownerSession, MEMBER);
		expect(where).toEqual({
			OR: [{ userId: OWNER_ID }, { visibility: { in: ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT'] } }]
		});
	});

	it('a non-member ORs in own claims plus PUBLIC only', () => {
		expect(claimVisibilityWhere(communitySession, NON_MEMBER)).toEqual({
			OR: [{ userId: OTHER_ID }, { visibility: 'PUBLIC' }]
		});
	});

	it('admin gets no restriction even with viewerIsMember: false', () => {
		expect(claimVisibilityWhere(adminSession, NON_MEMBER)).toEqual({});
	});

	it('public gets PUBLIC only', () => {
		expect(claimVisibilityWhere(publicSession, MEMBER)).toEqual({ visibility: 'PUBLIC' });
	});
});
