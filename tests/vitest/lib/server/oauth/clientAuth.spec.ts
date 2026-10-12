import { describe, expect, test, vi } from 'vitest';

import { parseClientSecretBasic } from '../../../../../src/lib/server/oauth/clientAuth';

// clientAuth.ts imports the prisma singleton at module load; mock it so the
// pure parsing function can be tested without a DB.
vi.mock('../../../../../src/prisma/client');

function basic(clientId: string, clientSecret: string): string {
	return 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
}

describe('parseClientSecretBasic', () => {
	test('decodes a well-formed Basic header', () => {
		expect(parseClientSecretBasic(basic('client-1', 's3cr3t'))).toEqual({
			clientId: 'client-1',
			clientSecret: 's3cr3t'
		});
	});

	test('URL-decodes each component (RFC6749 §2.3.1)', () => {
		// secret with a colon and a space, percent-encoded
		const header = 'Basic ' + Buffer.from('id%20a:p%3Aw').toString('base64');
		expect(parseClientSecretBasic(header)).toEqual({
			clientId: 'id a',
			clientSecret: 'p:w'
		});
	});

	test('keeps colons after the first as part of the secret', () => {
		const header = 'Basic ' + Buffer.from('id:a:b:c').toString('base64');
		expect(parseClientSecretBasic(header)).toEqual({
			clientId: 'id',
			clientSecret: 'a:b:c'
		});
	});

	test('returns null for a null header', () => {
		expect(parseClientSecretBasic(null)).toBeNull();
	});

	test('returns null for a non-Basic scheme', () => {
		expect(parseClientSecretBasic('Bearer abc')).toBeNull();
	});

	test('returns null when there is no colon separator', () => {
		const header = 'Basic ' + Buffer.from('nocolon').toString('base64');
		expect(parseClientSecretBasic(header)).toBeNull();
	});

	test('returns null for an empty clientId', () => {
		const header = 'Basic ' + Buffer.from(':secret').toString('base64');
		expect(parseClientSecretBasic(header)).toBeNull();
	});

	test('returns null for a malformed header with extra tokens', () => {
		expect(parseClientSecretBasic('Basic abc def')).toBeNull();
	});
});
