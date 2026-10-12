import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { setSessionCookie } from '../support/session';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 5: an authenticated member (B) endorses another member's (A) claim.
// Submitting the endorse form upserts a ClaimEndorsement tied to A's claim with
// B as the creator.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, host, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'endorse');

const memberAEmail = 'member-a@example.com';

let orgId: string;
let sessionBId: string;
let achievementId: string;
let claimId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	const { userId: userAId } = await svc.createMemberUser(orgId, { email: memberAEmail });
	const { userId: userBId } = await svc.createMemberUser(orgId, { email: 'member-b@example.com' });
	sessionBId = (await svc.createSession(orgId, userBId)).sessionId;
	({ achievementId } = await svc.createAchievement(orgId, {
		name: 'Endorsable Badge',
		claimable: true
	}));
	({ claimId } = await svc.createClaim(orgId, { userId: userAId, achievementId }));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('member endorses another member claim', async ({ page }) => {
	await setSessionCookie(page.context(), host, sessionBId);

	// Visit the claim, then follow the endorse entry point.
	await page.goto(`${origin}/claims/${claimId}`);
	await page.goto(`${origin}/claims/${claimId}/endorse`);

	// Narrative/evidence are optional; submit the endorsement.
	await page.getByRole('button', { name: 'Submit' }).click();

	// The endorse confirmation view renders.
	await expect(page.getByText('Awarded badge')).toBeVisible();

	// An endorsement now exists against member A's claim on this achievement.
	const invite = await svc.getInviteFor({ orgId, email: memberAEmail, achievementId });
	expect(invite).not.toBeNull();
});
