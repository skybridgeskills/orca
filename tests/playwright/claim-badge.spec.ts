import { test, expect } from '@playwright/test';
import { prisma } from '../../src/prisma/client.js';
import type { Achievement, Organization } from '@prisma/client';

const currentOrgUrl = `http://${process.env.ORG_DOMAIN}`;
let organization: Organization;
let achievement: Achievement;

test.beforeAll(async () => {
	organization = await prisma.organization.findUniqueOrThrow({
		where: {
			id: process.env.ORG_ID
		}
	});

	achievement = await prisma.achievement.findUniqueOrThrow({
		where: {
			id: process.env.ACHIEVEMENT_ID
		}
	});
});

test('Achievement appears on list', async ({ page }) => {
	await page.goto(`${currentOrgUrl}/achievements`);
	await expect(page.getByRole('status', { name: 'Loading...' })).toBeHidden();
	await expect(page.getByText(achievement.name)).toBeVisible();

	// Expect a title "to contain" a substring.
	//await expect(page).toHaveTitle(/Achievements/);
	await expect(page.getByText(achievement.name)).toBeVisible();
});

test.skip('get started link', async ({ page }) => {
	await page.goto(`${currentOrgUrl}/achievements`);
	await expect(page.getByRole('status', { name: 'Loading...' })).toBeHidden();
	await expect(page.getByText(achievement.name)).toBeVisible();

	// Click the get started link.
	await page.getByRole('link', { name: 'Privacy Policy' }).click();

	// Expects the URL to contain intro.
	await expect(page).toHaveURL(/privacy/);
});
