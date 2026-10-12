import { createHash, randomBytes } from 'node:crypto';

import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';
import { test, expect, type Page } from '@playwright/test';
import type { Organization, User } from '@prisma/client';

import { prisma } from '../../src/prisma/client.js';

// End-to-end exercise of the OB3 user-delegated OAuth flow against a real
// server + test database: dynamic registration → discovery → consent UI →
// authorization_code (PKCE) → token → getCredentials → refresh → revoke, plus
// the OAuth error cases. Everything is seeded with `prisma` (mirrors
// claim-badge.spec.ts). The seeded org has a signing key so getCredentials can
// MINT the missing credential on demand.
//
// ORCA resolves the org by HTTP Host. To stay isolated from the other e2e specs
// (which also boot against this one server + test DB), this spec uses a UNIQUE
// `*.localhost` org domain and addresses everything through it: browsers and
// the Playwright `request` client both resolve `connect.localhost` to loopback
// and reach the server (Vite runs with `allowedHosts: true`). The org is
// resolved from that Host with no header trickery, so cookies key cleanly to it.

// Serial: keep all of this file's tests in one worker so the shared org (seeded
// once in beforeAll) is created exactly once. Under fullyParallel a file's tests
// can otherwise be split across workers, each re-running beforeAll → duplicate
// org domain.
test.describe.configure({ mode: 'serial' });

const PORT = process.env.SERVER_PORT || '5150';
const ORG_DOMAIN = `connect.localhost:${PORT}`;
const ORG_HOST = `connect.localhost`;
const ORIGIN = `http://${ORG_DOMAIN}`;

let org: Organization;
let user: User;
let sessionId: string;

const REDIRECT_URI = 'https://client.example.org/callback';
const SCOPE_CREDENTIAL_READONLY =
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.readonly';
const SCOPE_OFFLINE_ACCESS = 'offline_access';

function basicAuth(clientId: string, clientSecret: string): string {
	return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

function s256(verifier: string): string {
	return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

/**
 * Click "Allow access" on the consent screen and return the off-site
 * `redirect_uri?code=...&state=...` the browser is sent to. We intercept the
 * external redirect with `page.route` and fulfil it with a stub page so the
 * navigation completes cleanly (the real client.example.org host is never
 * reachable); the intercepted request URL carries the authorization code.
 */
async function approveAndCaptureRedirect(page: Page, redirectUri = REDIRECT_URI): Promise<string> {
	// The consent form is a plain POST that 302s to the off-site redirect_uri.
	// The browser will try to navigate there (the host is unreachable in tests),
	// so we (a) wait for the outgoing request to that URL and (b) click with
	// `noWaitAfter` so the click promise doesn't hang on the failed navigation.
	const redirectRequest = page.waitForRequest((req) => req.url().startsWith(redirectUri));
	await page.getByRole('button', { name: 'Allow access' }).click({ noWaitAfter: true });
	return (await redirectRequest).url();
}

test.beforeAll(async () => {
	// A signing-key issuer org (explicitly selects type=signingKey) so the
	// getCredentials mint path runs.
	org = await prisma.organization.create({
		data: {
			domain: ORG_DOMAIN,
			name: 'OAuth Connect Test Org',
			description: 'org for the oauth-connect e2e',
			email: 'noreply@orcapods.dev',
			json: { issuer: { type: 'signingKey' } }
		}
	});

	const keyPair = await Ed25519VerificationKey.generate();
	if (!keyPair.privateKeyMultibase) {
		throw new Error('Generated key pair is missing a private key.');
	}
	await prisma.signingKey.create({
		data: {
			organizationId: org.id,
			publicKeyMultibase: keyPair.publicKeyMultibase,
			privateKeyMultibase: keyPair.privateKeyMultibase
		}
	});

	user = await prisma.user.create({
		data: {
			organizationId: org.id,
			givenName: 'Connie',
			familyName: 'Tester',
			identifiers: {
				create: {
					organizationId: org.id,
					type: 'EMAIL',
					identifier: 'connie@orcapods.dev'
				}
			}
		}
	});

	// A valid, logged-in session — set straight into the cookie so we skip the
	// magic-link login flow (hooks.server.ts looks the session up by id + org).
	const session = await prisma.session.create({
		data: {
			organizationId: org.id,
			userId: user.id,
			code: randomBytes(8).toString('hex'),
			valid: true,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000)
		}
	});
	sessionId = session.id;

	const achievement = await prisma.achievement.create({
		data: {
			organizationId: org.id,
			name: 'Delegated Read Badge',
			description: 'A badge the user has accepted.',
			json: '{}',
			identifier: randomBytes(8).toString('hex'),
			criteriaNarrative: 'Awarded for testing.'
		}
	});

	// An ACCEPTED claim WITHOUT a stored credential, so getCredentials mints it.
	await prisma.achievementClaim.create({
		data: {
			organizationId: org.id,
			userId: user.id,
			achievementId: achievement.id,
			claimStatus: 'ACCEPTED',
			json: '{}'
		}
	});
});

test.afterAll(async () => {
	await prisma.oAuthAccessToken.deleteMany({ where: { organizationId: org.id } });
	await prisma.oAuthAuthorizationCode.deleteMany({ where: { organizationId: org.id } });
	await prisma.oAuthClient.deleteMany({ where: { organizationId: org.id } });
	await prisma.achievementCredential.deleteMany({ where: { organizationId: org.id } });
	await prisma.achievementClaim.deleteMany({ where: { organizationId: org.id } });
	await prisma.achievement.deleteMany({ where: { organizationId: org.id } });
	await prisma.session.deleteMany({ where: { organizationId: org.id } });
	await prisma.identifier.deleteMany({ where: { organizationId: org.id } });
	await prisma.user.deleteMany({ where: { organizationId: org.id } });
	await prisma.signingKey.deleteMany({ where: { organizationId: org.id } });
	await prisma.organization.delete({ where: { id: org.id } });
});

test('full user-delegated flow: register → authorize → token → getCredentials → refresh → revoke', async ({
	page,
	request
}) => {
	// 1. Dynamic client registration -----------------------------------------
	const regRes = await request.post(`${ORIGIN}/ims/ob/v3p0/registration`, {
		data: {
			client_name: 'E2E Connect Client',
			client_uri: 'https://client.example.org',
			logo_uri: 'https://client.example.org/logo.png',
			tos_uri: 'https://client.example.org/tos',
			policy_uri: 'https://client.example.org/policy',
			redirect_uris: [REDIRECT_URI],
			scope: `${SCOPE_CREDENTIAL_READONLY} ${SCOPE_OFFLINE_ACCESS}`
		}
	});
	expect(regRes.status()).toBe(201);
	const reg = await regRes.json();
	expect(reg.client_id).toBeTruthy();
	expect(reg.client_secret).toBeTruthy();
	// Only credential.readonly + offline_access honoured (upsert/profile dropped).
	expect(reg.scope.split(' ').sort()).toEqual(
		[SCOPE_CREDENTIAL_READONLY, SCOPE_OFFLINE_ACCESS].sort()
	);
	const clientId: string = reg.client_id;
	const clientSecret: string = reg.client_secret;

	// 2. Discovery ------------------------------------------------------------
	const discoRes = await request.get(`${ORIGIN}/ims/ob/v3p0/discovery`);
	expect(discoRes.status()).toBe(200);
	const disco = await discoRes.json();
	const discoStr = JSON.stringify(disco);
	// The SDD reflects this org and advertises the four endpoint URLs. The
	// registration/token/auth URLs are emitted as absolute, host-qualified URLs;
	// the getCredentials path lives under the server base url + `/credentials`.
	expect(discoStr).toContain(ORG_DOMAIN);
	expect(discoStr).toContain(`/ims/ob/v3p0/registration`);
	expect(discoStr).toContain(`/ims/ob/v3p0/token`);
	expect(discoStr).toContain(`/ims/ob/v3p0/auth`);
	expect(discoStr).toContain(`/ims/ob/v3p0"`); // servers[].url base for /credentials
	expect(discoStr).toContain(`"/credentials"`);

	// 3. Authorize (consent UI) ----------------------------------------------
	const verifier = randomBytes(32).toString('base64url');
	const challenge = s256(verifier);
	const state = randomBytes(8).toString('hex');

	// Seed the logged-in session cookie for the org host.
	await page
		.context()
		.addCookies([{ name: 'sessionId', value: sessionId, domain: ORG_HOST, path: '/' }]);

	const authUrl =
		`${ORIGIN}/ims/ob/v3p0/auth?response_type=code` +
		`&client_id=${encodeURIComponent(clientId)}` +
		`&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
		`&scope=${encodeURIComponent(`${SCOPE_CREDENTIAL_READONLY} ${SCOPE_OFFLINE_ACCESS}`)}` +
		`&state=${state}` +
		`&code_challenge=${challenge}&code_challenge_method=S256`;

	await page.goto(authUrl);
	await expect(page.getByText('Confirm connection')).toBeVisible();
	await expect(page.getByText('E2E Connect Client')).toBeVisible();

	const redirectedTo = await approveAndCaptureRedirect(page);
	const redirected = new URL(redirectedTo);
	expect(redirected.searchParams.get('state')).toBe(state);
	const code = redirected.searchParams.get('code');
	expect(code).toBeTruthy();

	// 4. Token (authorization_code) ------------------------------------------
	const tokenRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: {
			grant_type: 'authorization_code',
			code: code as string,
			redirect_uri: REDIRECT_URI,
			code_verifier: verifier
		}
	});
	expect(tokenRes.status()).toBe(200);
	const tokens = await tokenRes.json();
	expect(tokens.token_type).toBe('bearer');
	expect(tokens.expires_in).toBe(3600);
	expect(tokens.access_token).toBeTruthy();
	expect(tokens.refresh_token).toBeTruthy();
	expect(tokens.scope.split(' ').sort()).toEqual(
		[SCOPE_CREDENTIAL_READONLY, SCOPE_OFFLINE_ACCESS].sort()
	);
	let accessToken: string = tokens.access_token;
	const refreshToken: string = tokens.refresh_token;

	// 5. getCredentials -------------------------------------------------------
	const credsRes = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	expect(credsRes.status()).toBe(200);
	expect(credsRes.headers()['x-total-count']).toBe('1');
	expect(credsRes.headers()['link']).toBeTruthy();
	const creds = await credsRes.json();
	expect(Array.isArray(creds.credential)).toBe(true);
	expect(creds.credential.length).toBe(1);
	// The minted credential is a signed OpenBadgeCredential.
	expect(creds.credential[0].type).toContain('OpenBadgeCredential');
	expect(creds.credential[0].proof).toBeTruthy();

	// 6. Refresh (rotation in place) -----------------------------------------
	const refreshRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'refresh_token', refresh_token: refreshToken }
	});
	expect(refreshRes.status()).toBe(200);
	const refreshed = await refreshRes.json();
	expect(refreshed.access_token).toBeTruthy();
	expect(refreshed.refresh_token).toBeTruthy();
	expect(refreshed.refresh_token).not.toBe(refreshToken);
	const rotatedAccess: string = refreshed.access_token;
	const rotatedRefresh: string = refreshed.refresh_token;

	// Old refresh token is now dead.
	const staleRefreshRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'refresh_token', refresh_token: refreshToken }
	});
	expect(staleRefreshRes.status()).toBe(400);
	expect((await staleRefreshRes.json()).error).toBe('invalid_grant');

	// The rotated access token still reads credentials.
	const credsRes2 = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: `Bearer ${rotatedAccess}` }
	});
	expect(credsRes2.status()).toBe(200);
	accessToken = rotatedAccess;

	// 7. Revoke via the /apps UI ---------------------------------------------
	await page.goto(`${ORIGIN}/apps`);
	await expect(page.getByText('E2E Connect Client')).toBeVisible();
	page.once('dialog', (dialog) => dialog.accept());
	await page.getByRole('button', { name: 'Revoke access' }).click();
	await expect(page.getByText('E2E Connect Client')).toHaveCount(0);

	// After UI revoke, the rotated access token fails getCredentials.
	const afterRevoke = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: `Bearer ${accessToken}` }
	});
	expect(afterRevoke.status()).toBe(401);

	// The rotated refresh token is also dead.
	const afterRevokeRefresh = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: { grant_type: 'refresh_token', refresh_token: rotatedRefresh }
	});
	expect(afterRevokeRefresh.status()).toBe(400);
});

test('revoke via RFC7009 endpoint invalidates the access token', async ({ request, page }) => {
	const verifier = randomBytes(32).toString('base64url');
	const challenge = s256(verifier);
	const state = randomBytes(8).toString('hex');

	// All registered URIs (incl. redirect_uri) must share one host (RFC7591
	// validation), so the redirect_uri lives under the same host as the metadata.
	const redirectUri = 'https://revoke.example.org/callback';
	const regRes = await request.post(`${ORIGIN}/ims/ob/v3p0/registration`, {
		data: {
			client_name: 'E2E Revoke Client',
			client_uri: 'https://revoke.example.org',
			logo_uri: 'https://revoke.example.org/logo.png',
			tos_uri: 'https://revoke.example.org/tos',
			policy_uri: 'https://revoke.example.org/policy',
			redirect_uris: [redirectUri],
			scope: SCOPE_CREDENTIAL_READONLY
		}
	});
	expect(regRes.status()).toBe(201);
	const reg = await regRes.json();

	await page
		.context()
		.addCookies([{ name: 'sessionId', value: sessionId, domain: ORG_HOST, path: '/' }]);
	const authUrl =
		`${ORIGIN}/ims/ob/v3p0/auth?response_type=code` +
		`&client_id=${encodeURIComponent(reg.client_id)}` +
		`&redirect_uri=${encodeURIComponent(redirectUri)}` +
		`&scope=${encodeURIComponent(SCOPE_CREDENTIAL_READONLY)}` +
		`&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
	await page.goto(authUrl);
	const redirectedTo = await approveAndCaptureRedirect(page, redirectUri);
	const code = new URL(redirectedTo).searchParams.get('code') as string;

	const tokens = await (
		await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
			headers: { authorization: basicAuth(reg.client_id, reg.client_secret) },
			form: {
				grant_type: 'authorization_code',
				code,
				redirect_uri: redirectUri,
				code_verifier: verifier
			}
		})
	).json();

	// Token works before revoke.
	const before = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: `Bearer ${tokens.access_token}` }
	});
	expect(before.status()).toBe(200);

	// RFC7009 revoke → always 200.
	const revokeRes = await request.post(`${ORIGIN}/ims/ob/v3p0/revoke`, {
		headers: { authorization: basicAuth(reg.client_id, reg.client_secret) },
		form: { token: tokens.access_token, token_type_hint: 'access_token' }
	});
	expect(revokeRes.status()).toBe(200);

	// Token is now dead.
	const after = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: `Bearer ${tokens.access_token}` }
	});
	expect(after.status()).toBe(401);
});

test('negative cases: bad secret, PKCE failure, reused code, out-of-scope', async ({
	request,
	page
}) => {
	// Register a client and mint one auth code we can replay. All registered URIs
	// (incl. redirect_uri) share one host (RFC7591 validation).
	const redirectUri = 'https://neg.example.org/callback';
	const reg = await (
		await request.post(`${ORIGIN}/ims/ob/v3p0/registration`, {
			data: {
				client_name: 'E2E Negative Client',
				client_uri: 'https://neg.example.org',
				logo_uri: 'https://neg.example.org/logo.png',
				tos_uri: 'https://neg.example.org/tos',
				policy_uri: 'https://neg.example.org/policy',
				redirect_uris: [redirectUri],
				scope: `${SCOPE_CREDENTIAL_READONLY} ${SCOPE_OFFLINE_ACCESS}`
			}
		})
	).json();
	const clientId: string = reg.client_id;
	const clientSecret: string = reg.client_secret;

	async function mintCode(verifier: string): Promise<string> {
		const challenge = s256(verifier);
		const state = randomBytes(8).toString('hex');
		await page
			.context()
			.addCookies([{ name: 'sessionId', value: sessionId, domain: ORG_HOST, path: '/' }]);
		const authUrl =
			`${ORIGIN}/ims/ob/v3p0/auth?response_type=code` +
			`&client_id=${encodeURIComponent(clientId)}` +
			`&redirect_uri=${encodeURIComponent(redirectUri)}` +
			`&scope=${encodeURIComponent(SCOPE_CREDENTIAL_READONLY)}` +
			`&state=${state}&code_challenge=${challenge}&code_challenge_method=S256`;
		await page.goto(authUrl);
		const redirectedTo = await approveAndCaptureRedirect(page, redirectUri);
		return new URL(redirectedTo).searchParams.get('code') as string;
	}

	// (a) wrong client secret → 401 invalid_client.
	const verifier1 = randomBytes(32).toString('base64url');
	const code1 = await mintCode(verifier1);
	const badSecretRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, 'totally-wrong-secret') },
		form: {
			grant_type: 'authorization_code',
			code: code1,
			redirect_uri: redirectUri,
			code_verifier: verifier1
		}
	});
	expect(badSecretRes.status()).toBe(401);
	expect((await badSecretRes.json()).error).toBe('invalid_client');

	// (b) bad PKCE verifier → 400 invalid_grant.
	const badPkceRes = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: {
			grant_type: 'authorization_code',
			code: code1,
			redirect_uri: redirectUri,
			code_verifier: 'the-wrong-verifier'
		}
	});
	expect(badPkceRes.status()).toBe(400);
	expect((await badPkceRes.json()).error).toBe('invalid_grant');

	// (c) reused auth code → 400 invalid_grant. Mint a fresh code, consume it
	// once successfully, then replay it.
	const verifier2 = randomBytes(32).toString('base64url');
	const code2 = await mintCode(verifier2);
	const firstUse = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: {
			grant_type: 'authorization_code',
			code: code2,
			redirect_uri: redirectUri,
			code_verifier: verifier2
		}
	});
	expect(firstUse.status()).toBe(200);
	const replay = await request.post(`${ORIGIN}/ims/ob/v3p0/token`, {
		headers: { authorization: basicAuth(clientId, clientSecret) },
		form: {
			grant_type: 'authorization_code',
			code: code2,
			redirect_uri: redirectUri,
			code_verifier: verifier2
		}
	});
	expect(replay.status()).toBe(400);
	expect((await replay.json()).error).toBe('invalid_grant');

	// (d) bogus / out-of-scope bearer → 401 on getCredentials.
	const bogus = await request.get(`${ORIGIN}/ims/ob/v3p0/credentials`, {
		headers: { authorization: 'Bearer not-a-real-token' }
	});
	expect(bogus.status()).toBe(401);

	// (e) a client-credentials-style token lacking credential.readonly is also
	// covered in oauth-client-credentials.spec.ts; here we assert the unknown
	// scope at registration is dropped (server only stores supported scopes).
	const oddRegRes = await request.post(`${ORIGIN}/ims/ob/v3p0/registration`, {
		data: {
			client_name: 'E2E Odd Scope Client',
			client_uri: 'https://odd.example.org',
			logo_uri: 'https://odd.example.org/logo.png',
			tos_uri: 'https://odd.example.org/tos',
			policy_uri: 'https://odd.example.org/policy',
			redirect_uris: ['https://odd.example.org/callback'],
			scope: `${SCOPE_CREDENTIAL_READONLY} https://example.com/unsupported`
		}
	});
	expect(oddRegRes.status()).toBe(201);
	const oddReg = await oddRegRes.json();
	expect(oddReg.scope.split(' ')).not.toContain('https://example.com/unsupported');
});
