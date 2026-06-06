import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { setSessionCookie } from '../support/session';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 4: an authenticated member self-claims an open-claim achievement with no
// invite. Submitting the claim form creates the claim and redirects to it.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, host, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'authclaim');

let orgId: string;
let sessionId: string;
let achievementId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	const { userId } = await svc.createMemberUser(orgId, { email: 'member-claim@example.com' });
	({ sessionId } = await svc.createSession(orgId, userId));
	({ achievementId } = await svc.createAchievement(orgId, {
		name: 'Self Claimable Badge',
		claimable: true
	}));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('authenticated member claims an open-claim achievement', async ({ page }) => {
	await setSessionCookie(page.context(), host, sessionId);

	await page.goto(`${origin}/achievements/${achievementId}/claim`);

	// Authenticated: the claim form submits natively (narrative/evidence
	// optional) and the server redirects to the new claim. The redirect to
	// /claims/{id} only happens after the AchievementClaim row is created.
	await page.locator('#claimFormSubmitButton').click();
	await page.waitForURL(/\/claims\/[0-9a-f-]{36}$/);

	expect(page.url()).toContain('/claims/');
});
