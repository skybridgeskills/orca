import { beforeEach, describe, expect, it, vi } from 'vitest';

// P3: prove the usernameless-login options endpoint creates a pre-auth Session (invalid,
// no user, org-scoped), stores the WebAuthn challenge on it, and sets the cookie-bound
// `sessionId`. The WebAuthn options builder + prisma are mocked at the IO boundary; the
// real rpForOrg runs (it only reads org.domain/name).

const mockSessionCreate = vi.hoisted(() => vi.fn());
const mockBuildAuthOptions = vi.hoisted(() => vi.fn());
const mockIssueChallenge = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		session: { create: mockSessionCreate }
	}
}));

vi.mock('$lib/server/webauthn/ceremonies', () => ({
	buildAuthenticationOptions: mockBuildAuthOptions
}));

vi.mock('$lib/server/webauthn/challenge', () => ({
	issueChallenge: mockIssueChallenge
}));

vi.mock('$env/static/private', () => ({
	USE_SECURE_COOKIES: 'true'
}));

import { POST } from './+server';

const ORG = { id: 'org-1', domain: 'example.test', name: 'Example', json: {} };

function makeEvent() {
	const cookieSet = vi.fn();
	const event = {
		locals: { org: ORG },
		cookies: { set: cookieSet }
	} as unknown as Parameters<typeof POST>[0];
	return { event, cookieSet };
}

describe('webauthn/authenticate/options endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockBuildAuthOptions.mockResolvedValue({ challenge: 'chal-123', allowCredentials: [] });
		mockSessionCreate.mockImplementation(async ({ data }) => ({
			id: 'sess-1',
			...data
		}));
	});

	it('creates a pre-auth session with a challenge and sets the sessionId cookie', async () => {
		const { event, cookieSet } = makeEvent();
		const res = await POST(event);
		const payload = await res.json();

		// Pre-auth session: invalid, org-scoped, no user connected.
		expect(mockSessionCreate).toHaveBeenCalledTimes(1);
		const data = mockSessionCreate.mock.calls[0][0].data;
		expect(data.valid).toBe(false);
		expect(data.organizationId).toBe('org-1');
		expect(data.user).toBeUndefined();
		expect(data.expiresAt).toBeInstanceOf(Date);

		// Challenge from the built options is stored on the new session row.
		expect(mockIssueChallenge).toHaveBeenCalledWith('sess-1', 'chal-123');

		// Cookie binds the request to the pre-auth session (httpOnly, secure).
		expect(cookieSet).toHaveBeenCalledTimes(1);
		const [name, value, opts] = cookieSet.mock.calls[0];
		expect(name).toBe('sessionId');
		expect(value).toBe('sess-1');
		expect(opts).toMatchObject({ httpOnly: true, secure: true, path: '/' });

		// The options JSON is returned for startAuthentication.
		expect(payload.challenge).toBe('chal-123');
		expect(payload.allowCredentials).toEqual([]);
	});
});
