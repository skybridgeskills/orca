import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { setSessionCookie } from '../support/session';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 1 (+ folded flow 7): an admin creates an achievement through the real
// `/achievements/create` UI (the one spec that drives that form), then it shows
// on the achievement's page and on the public list. This is the only critical
// path that exercises the create form end to end; other specs seed achievements
// via the service.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, host, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'create');

let orgId: string;
let sessionId: string;
let stewardId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	const { userId } = await svc.createAdminUser(orgId, { email: 'admin-create@example.com' });
	({ sessionId } = await svc.createSession(orgId, userId));
	({ userId: stewardId } = await svc.createMemberUser(orgId, {
		email: 'steward-pick@example.com',
		givenName: 'Stella',
		familyName: 'Steward'
	}));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('admin creates an open-claim achievement and it appears on the list', async ({ page }) => {
	await setSessionCookie(page.context(), host, sessionId);

	const name = `Admin Created Badge ${Date.now()}`;

	await page.goto(`${origin}/achievements/create`);

	// Claim settings live inside a collapsible pane; open it and choose the
	// "claimable by anybody" (public, open-claim) option. The toggle is a client
	// handler, so retry the open until the radio appears — this also guarantees
	// the form is hydrated before we fill it (otherwise hydration resets the
	// bound inputs and wipes typed values).
	const publicRadio = page.locator('#achievementEdit_claimableSelectedOption_public');
	await expect(async () => {
		if (!(await publicRadio.isVisible())) {
			await page.getByRole('button', { name: 'Claim and review settings' }).click();
		}
		await expect(publicRadio).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 20000 });

	await page.locator('#achievementEdit_name').fill(name);
	await page.locator('#achievementEdit_description').fill('Created via the e2e create flow.');
	await publicRadio.check();

	await page.getByRole('button', { name: 'Submit' }).click();

	// On success the form navigates to the new achievement's page.
	await page.waitForURL(/\/achievements\/[0-9a-f-]{36}$/);
	await expect(page.getByText(name).first()).toBeVisible();

	// And it shows on the public achievements list.
	await page.goto(`${origin}/achievements`);
	await expect(page.getByText(name).first()).toBeVisible();
});

test('admin picks a steward by search; it survives a save with the settings pane collapsed', async ({
	page
}) => {
	await setSessionCookie(page.context(), host, sessionId);

	const name = `Stewarded Badge ${Date.now()}`;

	await page.goto(`${origin}/achievements/create`);

	// Open the claim pane once hydrated (see the first test).
	const settingsToggle = page.getByRole('button', { name: 'Claim and review settings' });
	const adminReviewRadio = page.locator('#achievementEdit_reviewOption_admin');
	await expect(async () => {
		if (!(await adminReviewRadio.isVisible())) await settingsToggle.click();
		await expect(adminReviewRadio).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 20000 });

	await page.locator('#achievementEdit_name').fill(name);
	await page.locator('#achievementEdit_description').fill('Stewards chosen through the picker.');
	await page.locator('#achievementEdit_claimableSelectedOption_public').check();
	await adminReviewRadio.check();

	// Search for the steward in the picker and add them; the modal stays open.
	await page.getByRole('button', { name: 'Add steward' }).click();
	await page.locator('#userMultiSelect_searchInput').fill('stella');
	const dialog = page.locator('#userMultiSelect_modal');
	const result = dialog.getByRole('listitem').filter({ hasText: 'Stella Steward' });
	await result.getByRole('button', { name: 'Add', exact: true }).click();
	await expect(result.getByRole('button', { name: 'Added', exact: true })).toBeVisible();
	await dialog.getByRole('button', { name: 'Close', exact: true }).click();

	const stewardsList = page.locator('#achievementEdit_stewards');
	await expect(stewardsList.getByText('Stella Steward')).toBeVisible();

	// Collapse the pane before submitting: the stewards must still be sent.
	await settingsToggle.click();
	await expect(adminReviewRadio).toBeHidden();

	await page.getByRole('button', { name: 'Submit' }).click();
	await page.waitForURL(/\/achievements\/[0-9a-f-]{36}$/);

	const achievementId = page.url().split('/').pop()!;
	const saved = await svc.getAchievement(orgId, achievementId);
	expect((saved?.json as { stewards?: string[] } | undefined)?.stewards).toEqual([stewardId]);
	await expect(page.getByText('or review by a designated steward')).toBeVisible();
});
