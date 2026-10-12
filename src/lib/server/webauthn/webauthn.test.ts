import { beforeEach, describe, expect, it, vi } from 'vitest';

// P1: pure WebAuthn primitives — RP derivation (port stripping), base64url codec,
// single-use challenge consume, and the userHasPasskey 2FA predicate. The
// @simplewebauthn ceremony wrappers are exercised via the endpoints (P2–P4) with the
// verify boundary mocked; here we test the deterministic pieces.

vi.mock('$env/static/public', () => ({ PUBLIC_HTTP_PROTOCOL: 'https' }));

const mockSessionUpdate = vi.hoisted(() => vi.fn());
const mockIdentifierCount = vi.hoisted(() => vi.fn());
vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		session: { update: mockSessionUpdate },
		identifier: { count: mockIdentifierCount }
	}
}));

import { consumeChallenge } from './challenge';
import { base64urlToBytes, bytesToBase64url } from './codec';
import { userHasPasskey } from './passkeys';
import { rpForOrg } from './rp';

beforeEach(() => vi.clearAllMocks());

describe('rpForOrg', () => {
	it('strips the port for rpID but keeps it in the origin', () => {
		expect(rpForOrg({ domain: 'localhost:5173', name: 'Dev' })).toEqual({
			rpID: 'localhost',
			rpName: 'Dev',
			expectedOrigin: 'https://localhost:5173'
		});
	});
	it('uses the bare domain when there is no port', () => {
		const rp = rpForOrg({ domain: 'badges.example.org', name: 'Example' });
		expect(rp.rpID).toBe('badges.example.org');
		expect(rp.expectedOrigin).toBe('https://badges.example.org');
	});
});

describe('base64url codec', () => {
	it('round-trips bytes', () => {
		const bytes = new Uint8Array([0, 1, 2, 250, 251, 252, 253, 254, 255]);
		const encoded = bytesToBase64url(bytes);
		expect(encoded).not.toMatch(/[+/=]/); // url-safe, unpadded
		expect(Array.from(base64urlToBytes(encoded))).toEqual(Array.from(bytes));
	});
});

describe('consumeChallenge (single-use + expiry)', () => {
	const base = { id: 's1' };

	it('returns the challenge and clears it when valid', async () => {
		const out = await consumeChallenge({
			...base,
			passkeyChallenge: 'abc',
			passkeyChallengeExpiresAt: new Date(Date.now() + 60_000)
		});
		expect(out).toBe('abc');
		expect(mockSessionUpdate).toHaveBeenCalledWith({
			where: { id: 's1' },
			data: { passkeyChallenge: null, passkeyChallengeExpiresAt: null }
		});
	});

	it('returns null and still clears when expired', async () => {
		const out = await consumeChallenge({
			...base,
			passkeyChallenge: 'abc',
			passkeyChallengeExpiresAt: new Date(Date.now() - 1)
		});
		expect(out).toBeNull();
		expect(mockSessionUpdate).toHaveBeenCalledOnce(); // cleared even on failure
	});

	it('returns null without a DB write when there is no challenge', async () => {
		const out = await consumeChallenge({
			...base,
			passkeyChallenge: null,
			passkeyChallengeExpiresAt: null
		});
		expect(out).toBeNull();
		expect(mockSessionUpdate).not.toHaveBeenCalled();
	});
});

describe('userHasPasskey', () => {
	it('true when the user has ≥1 PASSKEY identifier', async () => {
		mockIdentifierCount.mockResolvedValue(2);
		expect(await userHasPasskey('u1', 'o1')).toBe(true);
		expect(mockIdentifierCount).toHaveBeenCalledWith({
			where: { userId: 'u1', organizationId: 'o1', type: 'PASSKEY' }
		});
	});
	it('false when none', async () => {
		mockIdentifierCount.mockResolvedValue(0);
		expect(await userHasPasskey('u1', 'o1')).toBe(false);
	});
});
