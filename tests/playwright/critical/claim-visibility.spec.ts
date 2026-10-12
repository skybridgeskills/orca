import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { setSessionCookie } from '../support/session';
import { createPrismaTestControlService } from '../support/testControlService';

// The owner of a badge chooses who can see it on their own claim page, and the public
// OB2 assertion link follows that choice: served while Public, 404 otherwise.

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, host, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'visibility');

let orgId: string;
let ownerSessionId: string;
let otherSessionId: string;
let claimId: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	const { userId: ownerId } = await svc.createMemberUser(orgId, { email: 'owner@example.com' });
	const { userId: otherId } = await svc.createMemberUser(orgId, { email: 'other@example.com' });
	ownerSessionId = (await svc.createSession(orgId, ownerId)).sessionId;
	otherSessionId = (await svc.createSession(orgId, otherId)).sessionId;
	const { achievementId } = await svc.createAchievement(orgId, {
		name: 'Visibility Badge',
		claimable: true
	});
	// ACCEPTED, validFrom set, column-default visibility PUBLIC.
	({ claimId } = await svc.createClaim(orgId, { userId: ownerId, achievementId }));
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('owner makes a badge private and public again; the OB2 link follows', async ({
	page,
	request
}) => {
	// The `request` fixture carries no session cookie: an outsider following a shared link.
	const ob2 = () =>
		request.get(`${origin}/ob2/a/${claimId}`, { headers: { Accept: 'application/json' } });
	expect((await ob2()).status()).toBe(200);

	await setSessionCookie(page.context(), host, ownerSessionId);
	await page.goto(`${origin}/claims/${claimId}`);

	const control = page.locator('form[action="?/setVisibility"]');
	const select = control.getByLabel('Who can see this badge');
	const save = control.getByRole('button', { name: 'Save' });

	// Save is disabled only once the page has hydrated (no-JS owners can always submit);
	// wait for that so the selection drives the warning.
	await expect(save).toBeDisabled();
	await select.selectOption('PRIVATE');
	await expect(control.getByText(/will stop working/)).toBeVisible();
	await save.click();
	await expect(page.getByText('Visibility updated')).toBeVisible();
	await expect(page.getByText(/Only public badges can be shared/)).toBeVisible();
	expect((await ob2()).status()).toBe(404);

	await select.selectOption('PUBLIC');
	await save.click();
	await expect(page.getByText('Visibility updated').first()).toBeVisible();
	await expect(page.getByText(/Only public badges can be shared/)).toBeHidden();
	expect((await ob2()).status()).toBe(200);
});

test('another member sees no visibility control on the owner’s badge', async ({ page }) => {
	await setSessionCookie(page.context(), host, otherSessionId);
	await page.goto(`${origin}/claims/${claimId}`);
	await expect(page.getByText('Visibility Badge').first()).toBeVisible();
	await expect(page.getByText('Who can see this badge')).toHaveCount(0);
});
