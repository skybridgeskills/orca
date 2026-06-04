import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';

import { hashSecret, verifySecret } from '../../../../../src/lib/server/oauth/secretHash';

describe('hashSecret', () => {
	test('produces a self-describing scrypt$16384$8$1$... string', () => {
		const stored = hashSecret('s3cr3t');
		expect(stored.startsWith('scrypt$16384$8$1$')).toBe(true);
		expect(stored.split('$')).toHaveLength(6);
	});
	test('uses a random salt (two calls on the same input differ)', () => {
		expect(hashSecret('same')).not.toBe(hashSecret('same'));
	});
});

describe('verifySecret', () => {
	test('returns true for the matching secret', () => {
		const stored = hashSecret('correct horse battery staple');
		expect(verifySecret('correct horse battery staple', stored)).toBe(true);
	});
	test('returns false for a wrong secret', () => {
		const stored = hashSecret('correct horse battery staple');
		expect(verifySecret('wrong secret', stored)).toBe(false);
	});
	test('returns false for malformed input', () => {
		expect(verifySecret('x', 'not-a-hash')).toBe(false);
		expect(verifySecret('x', 'scrypt$16384$8$1$onlyfiveparts')).toBe(false);
		expect(verifySecret('x', '')).toBe(false);
	});
	test('returns false for sha256-shaped input (confirms upgrade away from sha256)', () => {
		const sha = createHash('sha256').update('correct horse battery staple').digest('hex');
		expect(verifySecret('correct horse battery staple', sha)).toBe(false);
	});
});
