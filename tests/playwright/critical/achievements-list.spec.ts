import { test, expect } from '@playwright/test';

import { resolveOrgHost } from '../support/domain';
import { createPrismaTestControlService } from '../support/testControlService';

// Flow 6 (+ folded flow 7): an unauthenticated visitor can view the
// achievements list, sees a seeded achievement, and is NOT offered admin-only
// controls (the "Create new" action).

test.describe.configure({ mode: 'serial' });

const svc = createPrismaTestControlService();
const { domain, origin } = resolveOrgHost(process.env.E2E_BASE_URL, 'list');

let orgId: string;
let achievementName: string;

test.beforeAll(async () => {
	({ orgId } = await svc.provisionOrg({ domain }));
	achievementName = `List Visible Badge ${Date.now()}`;
	await svc.createAchievement(orgId, { name: achievementName, claimable: true });
});

test.afterAll(async () => {
	await svc.cleanupOrg(orgId);
});

test('unauthenticated visitor sees achievements without admin controls', async ({ page }) => {
	await page.goto(`${origin}/achievements`);

	await expect(page.getByRole('heading', { name: 'Achievements' }).first()).toBeVisible();
	// The list loads client-side; the assertion retries until it renders.
	await expect(page.getByText(achievementName).first()).toBeVisible();

	// No admin session → the "Create new" control is absent.
	await expect(page.locator('a[href="/achievements/create"]')).toHaveCount(0);
});
