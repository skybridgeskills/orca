import { beforeEach, describe, expect, it, vi } from 'vitest';

// P2: prove the passkey-register verify endpoint persists a PASSKEY Identifier with the
// credential material encoded into json + a (stripped) label, and rejects a missing /
// expired challenge and a duplicate credentialId. The WebAuthn verification and prisma
// are mocked at the IO boundary; the real challenge wiring is exercised via consumeChallenge.

const mockSessionFindUnique = vi.hoisted(() => vi.fn());
const mockIdentifierFindFirst = vi.hoisted(() => vi.fn());
const mockIdentifierCreate = vi.hoisted(() => vi.fn());
const mockConsumeChallenge = vi.hoisted(() => vi.fn());
const mockVerifyRegistration = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		session: { findUnique: mockSessionFindUnique },
		identifier: { findFirst: mockIdentifierFindFirst, create: mockIdentifierCreate }
	}
}));

vi.mock('$lib/server/webauthn/challenge', () => ({
	consumeChallenge: mockConsumeChallenge
}));

vi.mock('$lib/server/webauthn/ceremonies', () => ({
	verifyRegistration: mockVerifyRegistration
}));

// rpForOrg is pure; let the real one run (it only reads org.domain/name).
vi.mock('$lib/server/webauthn/rp', () => ({
	rpForOrg: () => ({
		rpID: 'example.test',
		rpName: 'Example',
		expectedOrigin: 'https://example.test'
	})
}));

import { POST } from './+server';

const ORG = { id: 'org-1', domain: 'example.test', name: 'Example', json: {} };

function makeEvent(body: unknown) {
	return {
		request: { json: async () => body },
		locals: {
			org: ORG,
			session: { id: 'sess-1', user: { id: 'user-1' } }
		}
	} as unknown as Parameters<typeof POST>[0];
}

const VERIFIED_CRED = {
	credentialId: 'cred-abc',
	publicKey: 'pubkey-base64url',
	counter: 0,
	transports: ['internal'],
	deviceType: 'singleDevice',
	backedUp: false
};

describe('webauthn/register/verify endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionFindUnique.mockResolvedValue({
			id: 'sess-1',
			passkeyChallenge: 'chal',
			passkeyChallengeExpiresAt: new Date(Date.now() + 60_000)
		});
		mockConsumeChallenge.mockResolvedValue('chal');
		mockVerifyRegistration.mockResolvedValue(VERIFIED_CRED);
		mockIdentifierFindFirst.mockResolvedValue(null);
		mockIdentifierCreate.mockImplementation(async ({ data }) => ({ id: 'iden-1', ...data }));
	});

	it('creates a PASSKEY Identifier with encoded json + stripped label, never returning secrets', async () => {
		const res = await POST(makeEvent({ response: {}, label: '<b>My Laptop</b>' }));
		const payload = await res.json();

		expect(mockIdentifierCreate).toHaveBeenCalledTimes(1);
		const data = mockIdentifierCreate.mock.calls[0][0].data;
		expect(data.type).toBe('PASSKEY');
		expect(data.identifier).toBe('cred-abc');
		expect(data.organizationId).toBe('org-1');
		expect(data.userId).toBe('user-1');
		expect(data.visibility).toBe('PRIVATE');
		expect(data.verifiedAt).toBeInstanceOf(Date);
		// Credential material lives only in json; the label is HTML-stripped.
		expect(data.json.publicKey).toBe('pubkey-base64url');
		expect(data.json.counter).toBe(0);
		expect(data.json.label).toBe('My Laptop');

		// Response exposes only safe metadata — never publicKey/counter.
		expect(payload.ok).toBe(true);
		expect(payload.passkey).toMatchObject({ id: 'iden-1', label: 'My Laptop' });
		expect(payload.passkey.publicKey).toBeUndefined();
		expect(payload.passkey.counter).toBeUndefined();
	});

	it('uses a default label when none is provided', async () => {
		await POST(makeEvent({ response: {} }));
		const data = mockIdentifierCreate.mock.calls[0][0].data;
		expect(data.json.label).toBeTruthy();
	});

	it('rejects a missing/expired challenge with a 400 and creates nothing', async () => {
		mockConsumeChallenge.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: {} }))).rejects.toMatchObject({ status: 400 });
		expect(mockVerifyRegistration).not.toHaveBeenCalled();
		expect(mockIdentifierCreate).not.toHaveBeenCalled();
	});

	it('rejects an invalid attestation (verifyRegistration → null) with a 400', async () => {
		mockVerifyRegistration.mockResolvedValue(null);
		await expect(POST(makeEvent({ response: {} }))).rejects.toMatchObject({ status: 400 });
		expect(mockIdentifierCreate).not.toHaveBeenCalled();
	});

	it('rejects a duplicate credentialId with a 400 and creates nothing', async () => {
		mockIdentifierFindFirst.mockResolvedValue({ id: 'existing', identifier: 'cred-abc' });
		await expect(POST(makeEvent({ response: {} }))).rejects.toMatchObject({ status: 400 });
		expect(mockIdentifierCreate).not.toHaveBeenCalled();
	});

	it('rejects an unauthenticated request with a 401', async () => {
		const event = {
			request: { json: async () => ({ response: {} }) },
			locals: { org: ORG, session: null }
		} as unknown as Parameters<typeof POST>[0];
		await expect(POST(event)).rejects.toMatchObject({ status: 401 });
	});
});
