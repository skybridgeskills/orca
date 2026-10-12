import { describe, expect, test } from 'vitest';

import { generateOpaqueToken, hashToken } from '../../../../../src/lib/server/oauth/tokens';

describe('hashToken', () => {
	test('is deterministic', () => {
		expect(hashToken('abc')).toBe(hashToken('abc'));
	});
	test('matches a known sha256 vector', () => {
		// sha256('hello world')
		expect(hashToken('hello world')).toBe(
			'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'
		);
	});
	test('differs for different input', () => {
		expect(hashToken('a')).not.toBe(hashToken('b'));
	});
});

describe('generateOpaqueToken', () => {
	test('produces base64url of the expected length for 32 bytes', () => {
		const token = generateOpaqueToken();
		// 32 bytes base64url, no padding → 43 chars
		expect(token).toHaveLength(43);
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});
	test('honours a custom byte length', () => {
		// 16 bytes base64url → 22 chars
		expect(generateOpaqueToken(16)).toHaveLength(22);
	});
	test('is unique across calls', () => {
		const set = new Set(Array.from({ length: 100 }, () => generateOpaqueToken()));
		expect(set.size).toBe(100);
	});
});
