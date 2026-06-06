import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { setSessionCookie } from '../support/session';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 2: an admin invites a (non-member) recipient to claim an achievement by
// email. The award form creates a ClaimEndorsement with no claim attached, and
// the resulting invite link resolves for the recipient.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, host, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'invite');

let orgId: string;
let sessionId: string;
let achievementId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	const { userId } = await svc.createAdminUser(orgId, { email: 'admin-invite@example.com' });
	({ sessionId } = await svc.createSession(orgId, userId));
	({ achievementId } = await svc.createAchievement(orgId, {
		name: 'Invitable Badge',
		claimable: true
	}));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('admin invites a recipient by email and the invite resolves', async ({ page, browser }) => {
	await setSessionCookie(page.context(), host, sessionId);

	const recipient = `invitee-${Date.now()}@example.com`;

	await page.goto(`${origin}/achievements/${achievementId}/award`);
	await page.locator('#email').fill(recipient);
	await page.getByRole('button', { name: 'Submit' }).click();

	// The award confirmation view renders.
	await expect(page.getByText('Awarded badge')).toBeVisible();

	// An endorsement now exists for that recipient on this achievement.
	const invite = await svc.getInviteFor({ orgId, email: recipient, achievementId });
	expect(invite).not.toBeNull();

	// The recipient's invite link resolves. Use a fresh (unauthenticated)
	// context: the /login load 404s if the invite is missing, the email
	// mismatches, or it already has a claim — so a 200 here also proves the
	// endorsement has no claim attached yet.
	const anon = await browser.newContext();
	const loginResp = await anon.request.get(
		`${origin}/login?i=${invite!.inviteId}&e=${encodeURIComponent(recipient)}`
	);
	expect(loginResp.status()).toBe(200);

	// The claim invite URL itself also renders for the recipient.
	const claimResp = await anon.request.get(
		`${origin}/achievements/${achievementId}/claim?i=${invite!.inviteId}&e=${encodeURIComponent(recipient)}`
	);
	expect(claimResp.status()).toBe(200);
	await anon.close();
});
