import { beforeEach, describe, expect, test, vi } from 'vitest';

// accessToken.ts imports the prisma singleton at module load. Mock the module so
// we can drive authenticateBearer's return value without a DB. isScopeSubset
// stays real (it is pure). resolveApiAuth itself contains the logic under test.
vi.mock('../../../../../src/lib/server/oauth/accessToken', () => ({
	authenticateBearer: vi.fn()
}));

import { authenticateBearer } from '../../../../../src/lib/server/oauth/accessToken';
import { parseBearer, resolveApiAuth } from '../../../../../src/lib/server/oauth/apiAuth';
import { SCOPE_ACHIEVEMENTCLAIM_READONLY } from '../../../../../src/lib/server/oauth/scopes';

const authenticateBearerMock = vi.mocked(authenticateBearer);

// Minimal Locals/Org stand-ins; resolveApiAuth only reads session + org identity.
const org = { id: 'org-1' } as App.Locals['org'];

function makeEvent(opts: {
	authHeader?: string | null;
	session?: { user: { id: string } } | null;
}): { request: Request; locals: App.Locals } {
	const headers = new Headers();
	if (opts.authHeader) headers.set('authorization', opts.authHeader);
	return {
		request: new Request('https://example.test/api/v1/achievementClaims', { headers }),
		locals: { org, session: opts.session ?? null } as unknown as App.Locals
	};
}

describe('parseBearer', () => {
	test('extracts a valid Bearer token', () => {
		expect(parseBearer('Bearer abc123')).toBe('abc123');
	});

	test('trims surrounding whitespace', () => {
		expect(parseBearer('Bearer   abc123  ')).toBe('abc123');
	});

	test('returns null for a missing header', () => {
		expect(parseBearer(null)).toBeNull();
	});

	test('returns null for a non-Bearer scheme', () => {
		expect(parseBearer('Basic abc123')).toBeNull();
	});

	test('returns null for an empty token', () => {
		expect(parseBearer('Bearer ')).toBeNull();
		expect(parseBearer('Bearer    ')).toBeNull();
	});
});

describe('resolveApiAuth', () => {
	beforeEach(() => {
		authenticateBearerMock.mockReset();
	});

	test('returns via:session for a logged-in session (no token lookup)', async () => {
		const event = makeEvent({ session: { user: { id: 'user-9' } } });
		const result = await resolveApiAuth(event, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
		expect(result).toEqual({
			via: 'session',
			userId: 'user-9',
			actingUserId: 'user-9',
			scopes: []
		});
		expect(authenticateBearerMock).not.toHaveBeenCalled();
	});

	test('returns unauthorized when there is no session and no bearer token', async () => {
		const event = makeEvent({});
		const result = await resolveApiAuth(event, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
		expect(result).toEqual({ error: 'unauthorized' });
		expect(authenticateBearerMock).not.toHaveBeenCalled();
	});

	test('returns unauthorized when the bearer token does not authenticate', async () => {
		authenticateBearerMock.mockResolvedValue(null);
		const event = makeEvent({ authHeader: 'Bearer bad-token' });
		const result = await resolveApiAuth(event, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
		expect(result).toEqual({ error: 'unauthorized' });
	});

	test('returns insufficient_scope when the token lacks the required scope', async () => {
		authenticateBearerMock.mockResolvedValue({
			token: {} as never,
			userId: null,
			actingUserId: 'owner-1',
			scopes: ['Achievement.readonly']
		});
		const event = makeEvent({ authHeader: 'Bearer ok-token' });
		const result = await resolveApiAuth(event, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
		expect(result).toEqual({ error: 'insufficient_scope' });
	});

	test('returns via:client_credentials when the token carries the required scope', async () => {
		authenticateBearerMock.mockResolvedValue({
			token: {} as never,
			userId: null,
			actingUserId: 'owner-1',
			scopes: [SCOPE_ACHIEVEMENTCLAIM_READONLY]
		});
		const event = makeEvent({ authHeader: 'Bearer ok-token' });
		const result = await resolveApiAuth(event, [SCOPE_ACHIEVEMENTCLAIM_READONLY]);
		expect(result).toEqual({
			via: 'client_credentials',
			userId: null,
			actingUserId: 'owner-1',
			scopes: [SCOPE_ACHIEVEMENTCLAIM_READONLY]
		});
	});
});
