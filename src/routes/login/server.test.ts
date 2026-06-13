import { beforeEach, describe, expect, it, vi } from 'vitest';

// P4: prove the login `verify` action enforces superadmin-org 2FA. A superadmin-org user
// WITH a passkey gets `needsPasskey` (email factor recorded, session NOT activated); a
// superadmin-org user WITHOUT a passkey, and any non-superadmin org, activate on email
// alone (unchanged). The webauthn helpers, superadmin detection, and prisma are mocked at
// the IO boundary.

const mockSessionFindFirst = vi.hoisted(() => vi.fn());
const mockSessionUpdate = vi.hoisted(() => vi.fn());
const mockIsSuperadminOrg = vi.hoisted(() => vi.fn());
const mockUserHasPasskey = vi.hoisted(() => vi.fn());
const mockGetUserPasskeys = vi.hoisted(() => vi.fn());
const mockBuildAuthOptions = vi.hoisted(() => vi.fn());
const mockIssueChallenge = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		session: { findFirst: mockSessionFindFirst, update: mockSessionUpdate, create: vi.fn() },
		identifier: { findFirst: vi.fn() },
		claimEndorsement: { findUnique: vi.fn() }
	}
}));

vi.mock('$lib/server/moderation/superadminOrg', () => ({
	isSuperadminOrg: mockIsSuperadminOrg
}));

vi.mock('$lib/server/webauthn/passkeys', () => ({
	userHasPasskey: mockUserHasPasskey,
	getUserPasskeys: mockGetUserPasskeys
}));

vi.mock('$lib/server/webauthn/ceremonies', () => ({
	buildAuthenticationOptions: mockBuildAuthOptions
}));

vi.mock('$lib/server/webauthn/challenge', () => ({
	issueChallenge: mockIssueChallenge
}));

vi.mock('$lib/server/webauthn/rp', () => ({
	rpForOrg: () => ({
		rpID: 'example.test',
		rpName: 'Example',
		expectedOrigin: 'https://example.test'
	})
}));

// The email-send + template + i18n are not exercised by the verify branch under test,
// but the module imports them at load time — stub to no-ops.
vi.mock('$lib/email/sendEmail', () => ({ sendOrcaMail: vi.fn() }));
vi.mock('$lib/email/template', () => ({ renderOrcaEmail: vi.fn() }));
vi.mock('$env/static/private', () => ({ USE_SECURE_COOKIES: 'false' }));

import { actions } from './+page.server';

const ORG = { id: 'org-1', domain: 'example.test', name: 'Example' };

function makeEvent(form: Record<string, string>, sessionId = 'sess-1') {
	const fd = new FormData();
	for (const [k, v] of Object.entries(form)) fd.set(k, v);
	return {
		request: { formData: async () => fd },
		locals: { org: ORG },
		cookies: { get: () => sessionId, set: vi.fn() }
	} as unknown as Parameters<NonNullable<typeof actions.verify>>[0];
}

describe('login verify action: superadmin-org 2FA gate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockSessionFindFirst.mockResolvedValue({
			id: 'sess-1',
			userId: 'user-1',
			invite: null
		});
		mockGetUserPasskeys.mockResolvedValue([{ credentialId: 'cred-1' }]);
		mockBuildAuthOptions.mockResolvedValue({ challenge: 'chal', allowCredentials: [] });
		mockSessionUpdate.mockImplementation(async ({ data, where }) => ({
			id: where.id,
			valid: data.valid ?? false,
			organizationId: 'org-1',
			expiresAt: new Date(Date.now() + 60_000),
			inviteId: null,
			user: { id: 'user-1' }
		}));
	});

	it('superadmin org + user WITH a passkey → needsPasskey, records email factor, does NOT activate', async () => {
		mockIsSuperadminOrg.mockReturnValue(true);
		mockUserHasPasskey.mockResolvedValue(true);

		const result = await actions.verify(makeEvent({ verificationCode: '123456' }));

		expect(result).toMatchObject({ needsPasskey: true });
		expect((result as { options: unknown }).options).toBeDefined();

		// Email factor recorded on the session, but it is NOT made valid.
		const emailVerifyCall = mockSessionUpdate.mock.calls.find((c) => c[0].data?.emailVerifiedAt);
		expect(emailVerifyCall).toBeDefined();
		expect(emailVerifyCall?.[0].data.valid).toBeUndefined();

		// No update ever set valid:true.
		const activated = mockSessionUpdate.mock.calls.find((c) => c[0].data?.valid === true);
		expect(activated).toBeUndefined();

		// A fresh challenge was issued for this session.
		expect(mockIssueChallenge).toHaveBeenCalledWith('sess-1', 'chal');
	});

	it('superadmin org + user WITHOUT a passkey → activates on email alone (unchanged)', async () => {
		mockIsSuperadminOrg.mockReturnValue(true);
		mockUserHasPasskey.mockResolvedValue(false);

		const result = await actions.verify(makeEvent({ verificationCode: '123456' }));

		expect((result as { session?: unknown }).session).toBeDefined();
		expect((result as { needsPasskey?: boolean }).needsPasskey).toBeUndefined();

		const activated = mockSessionUpdate.mock.calls.find((c) => c[0].data?.valid === true);
		expect(activated).toBeDefined();
		expect(mockBuildAuthOptions).not.toHaveBeenCalled();
		expect(mockIssueChallenge).not.toHaveBeenCalled();
	});

	it('non-superadmin org → activates on email alone, never checks passkeys', async () => {
		mockIsSuperadminOrg.mockReturnValue(false);
		mockUserHasPasskey.mockResolvedValue(true); // would be true, but org gate short-circuits

		const result = await actions.verify(makeEvent({ verificationCode: '123456' }));

		expect((result as { session?: unknown }).session).toBeDefined();
		const activated = mockSessionUpdate.mock.calls.find((c) => c[0].data?.valid === true);
		expect(activated).toBeDefined();
		expect(mockUserHasPasskey).not.toHaveBeenCalled();
		expect(mockBuildAuthOptions).not.toHaveBeenCalled();
	});
});
