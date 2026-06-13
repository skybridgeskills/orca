import { beforeEach, describe, expect, it, vi } from 'vitest';

// P4: prove the superadmin-org 2FA verify endpoint activates the session ONLY with a valid
// passkey assertion bound to the email-verified session's own user. It rejects (401) when:
// there is no cookie session, the session is already valid, `emailVerifiedAt` is null (the
// email factor can't be skipped), the challenge is missing/expired, the asserted credential
// does not belong to this session's user (factors can't be swapped), or verification fails.
// The WebAuthn verify, passkey lookup, challenge, and prisma are mocked; real rpForOrg runs.

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

describe('webauthn/2fa/verify endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionFindFirst.mockResolvedValue({
			id: 'sess-1',
			userId: 'user-1',
			valid: false,
			emailVerifiedAt: new Date(),
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

	it('activates the session with a valid assertion bound to the session user, persists counter', async () => {
		const res = await POST(makeEvent({ response: { id: 'cred-abc' }, next: '/dashboard' }));
		const payload = await res.json();

		expect(mockFindPasskey).toHaveBeenCalledWith('org-1', 'cred-abc');
		expect(mockConsumeChallenge).toHaveBeenCalledTimes(1);
		expect(mockUpdateCounter).toHaveBeenCalledWith('iden-1', PASSKEY.credential, 4);

		expect(mockSessionUpdate).toHaveBeenCalledTimes(1);
		const updateArg = mockSessionUpdate.mock.calls[0][0];
		expect(updateArg.where.id).toBe('sess-1');
		expect(updateArg.data.valid).toBe(true);

		expect(payload.ok).toBe(true);
		expect(payload.session).toMatchObject({ id: 'sess-1', valid: true });
		expect(payload.location).toBe('/dashboard');
	});

	it('rejects when there is no cookie-bound session with a 401', async () => {
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }, ''))).rejects.toMatchObject({
			status: 401
		});
		expect(mockSessionFindFirst).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects when emailVerifiedAt is null (email factor not done) and never activates', async () => {
		mockSessionFindFirst.mockResolvedValue({
			id: 'sess-1',
			userId: 'user-1',
			valid: false,
			emailVerifiedAt: null,
			passkeyChallenge: 'chal',
			passkeyChallengeExpiresAt: new Date(Date.now() + 60_000)
		});
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockConsumeChallenge).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects an already-valid session with a 401', async () => {
		mockSessionFindFirst.mockResolvedValue({
			id: 'sess-1',
			userId: 'user-1',
			valid: true,
			emailVerifiedAt: new Date(),
			passkeyChallenge: 'chal',
			passkeyChallengeExpiresAt: new Date(Date.now() + 60_000)
		});
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects a credential NOT belonging to the session user with a 401 (no factor swap)', async () => {
		mockFindPasskey.mockResolvedValue({ ...PASSKEY, userId: 'someone-else' });
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockVerifyAuthentication).not.toHaveBeenCalled();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});

	it('rejects a missing/expired challenge with a 401', async () => {
		mockConsumeChallenge.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: { id: 'cred-abc' } }))).rejects.toMatchObject({
			status: 401
		});
		expect(mockFindPasskey).not.toHaveBeenCalled();
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
