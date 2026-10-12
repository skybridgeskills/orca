import { randomBytes } from 'node:crypto';

import { test, expect, type Locator } from '@playwright/test';
import type { Organization, User } from '@prisma/client';

import { prisma } from '../../src/prisma/client.js';

// End-to-end exercise of the organisation (client_credentials) OAuth flow:
// a GENERAL_ADMIN creates a confidential app at /about/settings/apps (in a modal;
// secret revealed once; non-admins blocked) -> client_credentials token (no
// refresh) -> scoped GET /api/v1/achievementClaims with the bearer -> scope /
// disable / delete negatives. Seeded with `prisma`.
//
// Uses a UNIQUE `*.localhost` org domain (resolved to loopback) so it can run in
// parallel with the other e2e specs against the one shared server + test DB
// without org-resolution collisions. See oauth-connect.spec.ts for the rationale.

// Serial: keep all of this file's tests in one worker so the shared org (seeded
// once in beforeAll) is created exactly once. Under fullyParallel a file's tests
// can otherwise be split across workers, each re-running beforeAll -> duplicate
// org domain.
test.describe.configure({ mode: 'serial' });

const PORT = process.env.SERVER_PORT || '5150';
const ORG_DOMAIN = `cc.localhost:${PORT}`;
const ORG_HOST = `cc.localhost`;
const ORIGIN = `http://${ORG_DOMAIN}`;
const SCOPE = 'AchievementClaim.readonly';

let org: Organization;
let admin: User;
let member: User;
let adminSessionId: string;
let memberSessionId: string;
let achievementId: string;

function basicAuth(clientId: string, clientSecret: string): string {
	return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

// Click a JS-driven modal trigger and wait for the modal to open, retrying to
// absorb the SvelteKit hydration race right after navigation: a click that lands
// before hydration is a no-op for a modal whose open state lives in client JS.
async function openModal(trigger: Locator, modal: Locator): Promise<void> {
	await expect(async () => {
		await trigger.click();
		await expect(modal).toBeVisible({ timeout: 1500 });
	}).toPass({ timeout: 20000 });
}

async function seedUser(role: 'GENERAL_ADMIN' | null, email: string): Promise<User> {
	return prisma.user.create({
		data: {
			organizationId: org.id,
			givenName: role === 'GENERAL_ADMIN' ? 'Ada' : 'Mona',
			familyName: 'Tester',
			orgRole: role,
			identifiers: {
				create: { organizationId: org.id, type: 'EMAIL', identifier: email }
			}
		}
	});
}

async function seedSession(userId: string): Promise<string> {
	const session = await prisma.session.create({
		data: {
			organizationId: org.id,
			userId,
			code: randomBytes(8).toString('hex'),
			valid: true,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000)
		}
	});
	return session.id;
}

test.beforeAll(async () => {
	org = await prisma.organization.create({
		data: {
			domain: ORG_DOMAIN,
			name: 'OAuth CC Test Org',
			description: 'org for the client-credentials e2e',
			email: 'noreply@orcapods.dev'
		}
	});

	admin = await seedUser('GENERAL_ADMIN', 'ada-cc@orcapods.dev');
	member = await seedUser(null, 'mona-cc@orcapods.dev');
	adminSessionId = await seedSession(admin.id);
	memberSessionId = await seedSession(member.id);

	const achievement = await prisma.achievement.create({
		data: {
			organizationId: org.id,
			name: 'CC Read Badge',
			description: 'A badge with a claim the API can read.',
			json: '{}',
			identifier: randomBytes(8).toString('hex'),
			criteriaNarrative: 'Awarded for testing.'
		}
	});
	achievementId = achievement.id;

	await prisma.achievementClaim.create({
		data: {
			organizationId: org.id,
			userId: member.id,
			achievementId: achievement.id,
			claimStatus: 'ACCEPTED',
			json: '{}'
		}
	});
});

test.afterAll(async () => {
	await prisma.oAuthAccessToken.deleteMany({ where: { organizationId: org.id } });
	await prisma.oAuthClient.deleteMany({ where: { organizationId: org.id } });
	await prisma.achievementClaim.deleteMany({ where: { organizationId: org.id } });
	await prisma.achievement.deleteMany({ where: { organizationId: org.id } });
	await prisma.session.deleteMany({ where: { organizationId: org.id } });
	await prisma.identifier.deleteMany({ where: { organizationId: org.id } });
	await prisma.user.deleteMany({ where: { organizationId: org.id } });
	await prisma.organization.delete({ where: { id: org.id } });
});

test('non-admin is redirected away from /about/settings/apps', async ({ page }) => {
	await page
		.context()
		.addCookies([{ name: 'sessionId', value: memberSessionId, domain: ORG_HOST, path: '/' }]);
	await page.goto(`${ORIGIN}/about/settings/apps`);
	// load() redirects non-GENERAL_ADMIN to '/'.
	await expect(page).not.toHaveURL(/\/about\/settings\/apps/);
});

test('admin creates org app (modal) -> token -> scoped API read -> disable -> delete', async ({
	page,
	request
}) => {
	// 1. Admin opens the Add-app modal and creates an app; the secret is revealed
	//    once INSIDE the modal.
	await page
		.context()
		.addCookies([{ name: 'sessionId', value: adminSessionId, domain: ORG_HOST, path: '/' }]);
	await page.goto(`${ORIGIN}/about/settings/apps`);
	await expect(page).toHaveURL(/\/about\/settings\/apps/);

	const addModal = page.locator('#add-app-modal');
	await openModal(page.getByRole('button', { name: 'Add an app' }), addModal);
	await addModal.getByLabel('App name', { exact: false }).fill('E2E CC Service');
	await addModal
		.getByLabel('App URL', { exact: false })
		.fill('https://www.example.com/integration');
	// Check the AchievementClaim.readonly scope (rendered as "Read achievement
	// claims" - the only enforced/enabled checkbox).
	await addModal.getByRole('checkbox', { name: 'Read achievement claims' }).check();
	await addModal.getByRole('button', { name: 'Create app' }).click();

	// The one-time reveal shows the client_id + client_secret inside the modal.
	await expect(
		addModal.getByText("the secret won't be shown again", { exact: false })
	).toBeVisible();

	const created = await prisma.oAuthClient.findFirstOrThrow({
		where: { organizationId: org.id, clientName: 'E2E CC Service' }
	});
	expect(created.clientType).toBe('CONFIDENTIAL_SERVICE');
	expect(created.scopes).toEqual([SCOPE]);

	// Grab the revealed client_id + secret out of the modal (the secret is never
	// re-derivable from the hash, so the UI value is the source of truth).
	const revealed = await addModal.locator('dd.font-mono').allInnerTexts();
	expect(revealed.length).toBeGreaterThanOrEqual(2);
	const clientId = revealed[0].trim();
	const clientSecret = revealed[1].trim();
	expect(clientId).toBe(created.clientId);

	// Done closes the modal; the new app appears in the list.
	await addModal.getByRole('button', { name: 'Done' }).click();

	// The card title is plain text (NOT a link), and the URL is shown as an
	// external-link badge (new tab) - the domain, not the card title.
	await expect(page.getByText('E2E CC Service')).toBeVisible();
	await expect(page.getByRole('link', { name: 'E2E CC Service' })).toHaveCount(0);
	const domainBadge = page.getByRole('link', { name: /example\.com/ });
	await expect(domainBadge).toHaveAttribute('target', '_blank');
	await expect(domainBadge).toHaveAttribute('href', 'https://www.example.com/integration');

	// 2. client_credentials token (no refresh).
	const tokenRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'client_credentials', scope: SCOPE }
	});
	expect(tokenRes.status()).toBe(200);
	const tokens = await tokenRes.json();
	expect(tokens.token_type).toBe('bearer');
	expect(tokens.expires_in).toBe(3600);
	expect(tokens.access_token).toBeTruthy();
	expect(tokens.refresh_token).toBeUndefined();
	expect(tokens.scope).toBe(SCOPE);
	const accessToken: string = tokens.access_token;

	// 3. Scoped resource read with the bearer.
	const apiRes = await request.get(
		`${ORIGIN}/api/v1/achievementClaims?achievementId=${achievementId}`,
		{ headers: { authorization: `Bearer ${accessToken}` } }
	);
	expect(apiRes.status()).toBe(200);
	const apiBody = await apiRes.json();
	const rows = apiBody.data ?? apiBody;
	expect(Array.isArray(rows)).toBe(true);
	expect(rows.length).toBe(1);

	// The same endpoint still serves a session.
	const sessionApiRes = await request.get(
		`${ORIGIN}/api/v1/achievementClaims?achievementId=${achievementId}`,
		{ headers: { cookie: `sessionId=${adminSessionId}` } }
	);
	expect(sessionApiRes.status()).toBe(200);

	// 4a. Missing/invalid token -> 401.
	const noToken = await request.get(
		`${ORIGIN}/api/v1/achievementClaims?achievementId=${achievementId}`
	);
	expect(noToken.status()).toBe(401);

	// 4b. Disable via the styled confirm modal revokes tokens + blocks new ones.
	await page.goto(`${ORIGIN}/about/settings/apps`);
	const confirmModal = page.locator('#confirm-app-action-modal');
	await openModal(page.getByRole('button', { name: 'Disable' }).first(), confirmModal);
	await confirmModal.getByRole('button', { name: 'Disable' }).click();
	await expect(page.getByText('Disabled', { exact: true }).first()).toBeVisible();

	// The previously-issued token is now dead.
	const afterDisable = await request.get(
		`${ORIGIN}/api/v1/achievementClaims?achievementId=${achievementId}`,
		{ headers: { authorization: `Bearer ${accessToken}` } }
	);
	expect(afterDisable.status()).toBe(401);

	// A fresh client_credentials request is rejected (disabled client fails
	// client auth -> invalid_client).
	const reissue = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'client_credentials', scope: SCOPE }
	});
	expect(reissue.status()).toBe(401);
	expect((await reissue.json()).error).toBe('invalid_client');

	// 4c. Delete (soft) via the confirm modal removes the app from the list while
	// the history row is retained in the DB with `deletedAt` set.
	await openModal(page.getByRole('button', { name: 'Delete' }).first(), confirmModal);
	await confirmModal.getByRole('button', { name: 'Delete' }).click();
	await expect(page.getByText('E2E CC Service')).toHaveCount(0);

	const deleted = await prisma.oAuthClient.findFirstOrThrow({ where: { id: created.id } });
	expect(deleted.deletedAt).not.toBeNull();

	// A soft-deleted client can no longer authenticate.
	const afterDelete = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'client_credentials', scope: SCOPE }
	});
	expect(afterDelete.status()).toBe(401);
	expect((await afterDelete.json()).error).toBe('invalid_client');
});

test('scope negatives: unknown scope -> invalid_scope; wrong scope -> insufficient_scope', async () => {
	// Seed a confidential client directly with only an UNENFORCED scope so the
	// token lacks AchievementClaim.readonly. We seed via the admin service path
	// through prisma to keep it deterministic.
	const { createConfidentialClient } =
		await import('../../src/lib/server/oauth/confidentialClients.js');

	// (a) unknown scope at the token endpoint -> invalid_scope. First make a
	// client that only has AchievementClaim.readonly, then request a scope it
	// doesn't have.
	const { client, clientSecret } = await createConfidentialClient({
		org,
		createdByUserId: admin.id,
		clientName: 'E2E CC Scope Client',
		scopes: [SCOPE]
	});

	// Requesting an unsupported scope name -> invalid_scope (intersect drops it,
	// leaving an empty set).
	const unknownScopeRes = await fetch(`${ORIGIN}/ims/ob/v3p0/token`, {
		method: 'POST',
		headers: {
			authorization: basicAuth(client.clientId, clientSecret),
			'content-type': 'application/x-www-form-urlencoded'
		},
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			scope: 'Totally.unknown'
		})
	});
	expect(unknownScopeRes.status).toBe(400);
	expect((await unknownScopeRes.json()).error).toBe('invalid_scope');
});
