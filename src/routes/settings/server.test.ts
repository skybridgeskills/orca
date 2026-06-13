import { beforeEach, describe, expect, it, vi } from 'vitest';

// P2: prove /settings load surfaces only safe passkey metadata (never publicKey/counter)
// and that the save action's contact-identifier visibility update excludes PASSKEY rows
// (a passkey is an authenticator, never the user's contact identifier). prisma is mocked.

const mockIdentifierFindMany = vi.hoisted(() => vi.fn());
const mockIdentifierUpdateMany = vi.hoisted(() => vi.fn());
const mockUserUpdate = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());

vi.mock('../../prisma/client', () => ({
	prisma: {
		identifier: { findMany: mockIdentifierFindMany, updateMany: mockIdentifierUpdateMany },
		user: { update: mockUserUpdate, findUnique: mockUserFindUnique }
	}
}));

import { actions, load } from './+page.server';

const ORG = { id: 'org-1' };

function loadEvent(userJson: unknown = {}) {
	return {
		locals: { org: ORG, session: { id: 'sess-1', user: { id: 'user-1', json: userJson } } }
	} as unknown as Parameters<typeof load>[0];
}

function saveEvent(formData: FormData) {
	return {
		request: { formData: async () => formData },
		locals: { org: ORG, session: { id: 'sess-1', user: { id: 'user-1', json: {} } } }
	} as unknown as Parameters<typeof actions.save>[0];
}

describe('settings load: passkeys', () => {
	beforeEach(() => vi.clearAllMocks());

	it('decodes passkeys to safe metadata only (no publicKey/counter)', async () => {
		mockIdentifierFindMany.mockResolvedValue([
			{
				id: 'pk-1',
				verifiedAt: new Date('2026-01-01T00:00:00Z'),
				json: {
					publicKey: 'secret-key',
					counter: 7,
					label: 'My Laptop',
					deviceType: 'singleDevice',
					lastUsedAt: '2026-02-02T00:00:00Z'
				}
			}
		]);

		const result = (await load(loadEvent())) as { passkeys: Array<Record<string, unknown>> };

		// Query is scoped to the user + org + PASSKEY type.
		expect(mockIdentifierFindMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', organizationId: 'org-1', type: 'PASSKEY' }
		});
		expect(result.passkeys).toHaveLength(1);
		const pk = result.passkeys[0];
		expect(pk.id).toBe('pk-1');
		expect(pk.label).toBe('My Laptop');
		expect(pk.deviceType).toBe('singleDevice');
		expect(pk.createdAt).toEqual(new Date('2026-01-01T00:00:00Z'));
		expect(pk.lastUsedAt).toBe('2026-02-02T00:00:00Z');
		// Never leak credential material.
		expect(pk.publicKey).toBeUndefined();
		expect(pk.counter).toBeUndefined();
	});
});

describe('settings save: contact-identifier visibility excludes PASSKEY', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUserFindUnique.mockResolvedValue({ id: 'user-1', identifiers: [] });
	});

	it('treats only a non-PASSKEY identifier as the contact identifier and scopes the update', async () => {
		// User has a PASSKEY (PRIVATE) and an EMAIL (COMMUNITY). Changing the contact
		// visibility to PUBLIC must compare against the EMAIL row, not the passkey, and
		// the updateMany must skip PASSKEY rows.
		mockUserUpdate.mockResolvedValue({
			id: 'user-1',
			identifiers: [
				{ id: 'pk-1', type: 'PASSKEY', visibility: 'PRIVATE' },
				{ id: 'em-1', type: 'EMAIL', visibility: 'COMMUNITY' }
			]
		});

		const fd = new FormData();
		fd.set('givenName', 'A');
		fd.set('familyName', 'B');
		fd.set('identifierVisibility', 'PUBLIC');
		fd.set('defaultVisibility', 'COMMUNITY');
		fd.set('profileVisibility', 'COMMUNITY');

		await actions.save(saveEvent(fd));

		expect(mockIdentifierUpdateMany).toHaveBeenCalledTimes(1);
		expect(mockIdentifierUpdateMany).toHaveBeenCalledWith({
			where: { userId: 'user-1', type: { not: 'PASSKEY' } },
			data: { visibility: 'PUBLIC' }
		});
	});
});
