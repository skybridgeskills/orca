import { beforeEach, describe, expect, it, vi } from 'vitest';

// P3: prove the usernameless-login verify endpoint resolves the credential (and user)
// server-side from `response.id`, verifies the assertion against the session-stored
// (single-use) challenge, persists the new signature counter, and activates the session
// for the credential's owner — and that it rejects an unknown credentialId or a
// missing/expired challenge with a 401. The WebAuthn verify, passkey lookup, challenge,
// and prisma are mocked at the IO boundary; the real rpForOrg runs.

const mockSessionFindFirst = vi.hoisted(() => vi.fn());
const mockSessionUpdate = vi.hoisted(() => vi.fn());
const mockConsumeChallenge = vi.hoisted(() => vi.fn());
const mockVerifyAuthentication = vi.hoisted(() => vi.fn());
const mockFindPasskey = vi.hoisted(() => vi.fn());
const mockUpdateCounter = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		session: { findFirst: mockSessionFindFirst, update: mockSessionUpdate }
	}
}));

vi.mock('$lib/server/webauthn/challenge', () => ({
	consumeChallenge: mockConsumeChallenge
}));

vi.mock('$lib/server/webauthn/ceremonies', () => ({
	verifyAuthentication: mockVerifyAuthentication
}));

vi.mock('$lib/server/webauthn/passkeys', () => ({
	findPasskeyByCredentialId: mockFindPasskey,
	updatePasskeyCounter: mockUpdateCounter
}));

vi.mock('$lib/server/webauthn/rp', () => ({
	rpForOrg: () => ({
		rpID: 'example.test',
		rpName: 'Example',
		expectedOrigin: 'https://example.test'
	})
}));

import { POST } from './+server';

const ORG = { id: 'org-1', domain: 'example.test', name: 'Example', json: {} };

const PASSKEY = {
	identifierId: 'iden-1',
	credentialId: 'cred-abc',
	userId: 'user-1',
	credential: { publicKey: 'pubkey', counter: 3, transports: ['internal'], label: 'Laptop' }
};

function makeEvent(body: unknown, sessionId: string | undefined = 'sess-1') {
	return {
		request: { json: async () => body },
		locals: { org: ORG },
		cookies: { get: () => sessionId }
	} as unknown as Parameters<typeof POST>[0];
}

describe('webauthn/authenticate/verify endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionFindFirst.mockResolvedValue({
			id: 'sess-1',
			passkeyChallenge: 'chal',
			passkeyChallengeExpiresAt: new Date(Date.now() + 60_000)
		});
		mockConsumeChallenge.mockResolvedValue('chal');
		mockFindPasskey.mockResolvedValue(PASSKEY);
		mockVerifyAuthentication.mockResolvedValue({ newCounter: 4 });
		mockSessionUpdate.mockImplementation(async ({ data, where }) => ({
			id: where.id,
			valid: data.valid,
			organizationId: 'org-1',
			expiresAt: new Date(Date.now() + 60_000),
			user: { id: 'user-1' }
		}));
	});

	it('activates the session for the credential owner, persists the new counter, and clears the challenge', async () => {
		const res = await POST(makeEvent({ response: { id: 'cred-abc' }, next: '/dashboard' }));
		const payload = await res.json();

		// Identity resolved server-side from response.id, org-scoped.
		expect(mockFindPasskey).toHaveBeenCalledWith('org-1', 'cred-abc');

		// Challenge is consumed (single-use) before verification.
		expect(mockConsumeChallenge).toHaveBeenCalledTimes(1);

		// New counter is persisted against the resolved credential.
		expect(mockUpdateCounter).toHaveBeenCalledWith('iden-1', PASSKEY.credential, 4);

		// Session is activated and connected to the credential's user.
		expect(mockSessionUpdate).toHaveBeenCalledTimes(1);
		const updateArg = mockSessionUpdate.mock.calls[0][0];
		expect(updateArg.where.id).toBe('sess-1');
		expect(updateArg.data.valid).toBe(true);
		expect(updateArg.data.user).toEqual({ connect: { id: 'user-1' } });

		// Mirrors the email verify return shape: ok + session + location (honors next).
		expect(payload.ok).toBe(true);
		expect(payload.session).toMatchObject({ id: 'sess-1', valid: true });
		expect(payload.location).toBe('/dashboard');
	});

	it('defaults location to / when next is absent or not an internal path', async () => {
		const res = await POST(makeEvent({ response: { id: 'cred-abc' }, next: 'https://evil.test' }));
		const payload = await res.json();
		expect(payload.location).toBe('/');
	});

	it('rejects when there is no cookie-bound pre-auth session with a 401', async () => {
		// Empty cookie value is falsy → treated as no session.
		const res = POST(makeEvent({ response: { id: 'cred-abc' } }, ''));
		await expect(res).rejects.toMatchObject({ status: 401 });
		expect(mockSessionFindFirst).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects a missing/expired challenge with a 401 and never verifies or activates', async () => {
		mockConsumeChallenge.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockFindPasskey).not.toHaveBeenCalled();
		expect(mockVerifyAuthentication).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects an unknown credentialId with a 401 and never verifies or activates', async () => {
		mockFindPasskey.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: { id: 'nope' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockVerifyAuthentication).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects a failed assertion (verifyAuthentication → null) with a 401 and does not activate', async () => {
		mockVerifyAuthentication.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockUpdateCounter).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});
});
