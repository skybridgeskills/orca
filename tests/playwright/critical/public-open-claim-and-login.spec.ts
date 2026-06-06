import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 3: a public (unauthenticated) user claims an open-claim achievement.
// Submitting the claim form as a guest creates a self-invite and sends the user
// to login; they verify the emailed code (read from the DB via the service),
// complete registration, and the deferred claim auto-submits. This is the only
// critical path that exercises real login + registration.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'public');

let orgId: string;
let achievementId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	({ achievementId } = await svc.createAchievement(orgId, {
		name: 'Publicly Claimable Badge',
		claimable: true
	}));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('public user self-claims, logs in, registers, and completes the claim', async ({ page }) => {
	const email = `public-claimant-${Date.now()}@example.com`;

	// 1. As a guest, open the claim form and submit with an email. The client
	//    handler creates a self-invite endorsement and navigates to /login, so
	//    the page must be hydrated before submitting (otherwise the form posts
	//    natively). Wait for the client bundle to settle first.
	await page.goto(`${origin}/achievements/${achievementId}/claim`);
	await page.waitForLoadState('networkidle');
	await page.locator('#identifier_input').fill(email);
	await page.locator('#claimFormSubmitButton').click();

	// 2. The login page auto-submits the email (a userless session + OTP is
	//    created), landing on the verification step.
	await page.waitForURL(/\/login/);
	await expect(page.locator('#verificationCode')).toBeVisible();

	// 3. Read the OTP the server stored in Session.code and verify it. For an
	//    invite-backed userless session, verifying advances to registration.
	let otp: string | null = null;
	await expect
		.poll(
			async () => {
				otp = await svc.getLatestOtp({ orgId, email });
				return otp;
			},
			{ timeout: 10_000 }
		)
		.not.toBeNull();
	await page.locator('#verificationCode').fill(otp ?? '');
	await page.getByRole('button', { name: 'Submit' }).click();

	// 4. Complete the registration form (no further code needed).
	await expect(page.locator('#register_givenName')).toBeVisible();
	await page.locator('#register_givenName').fill('Pat');
	await page.locator('#register_familyName').fill('Claimant');
	await page.locator('#register_agreeTerms').check();
	await page.getByRole('button', { name: 'Submit' }).click();

	// 5. Registration redirects back to the claim, where the deferred claim
	//    auto-submits and lands on the completed claim page.
	await page.waitForURL(/\/claims\/[0-9a-f-]{36}$/, { timeout: 15_000 });
	expect(page.url()).toContain('/claims/');
});
