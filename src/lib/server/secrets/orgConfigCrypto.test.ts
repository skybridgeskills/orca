import { beforeEach, describe, expect, it } from 'vitest';

import { BadOrgConfigBlobError, decrypt, encrypt } from './orgConfigCrypto';

const VALID_KEY_B64 = Buffer.alloc(32, 7).toString('base64');

beforeEach(() => {
	process.env.ORG_CONFIG_ENCRYPTION_KEY = VALID_KEY_B64;
});

describe('orgConfigCrypto', () => {
	const keyError = 'ORG_CONFIG_ENCRYPTION_KEY must be 32 base64-encoded bytes';

	it('round-trips utf-8 plaintext', () => {
		expect(decrypt(encrypt('hello world'))).toBe('hello world');
	});

	it('uses a random IV so identical plaintexts yield different blobs', () => {
		expect(encrypt('x')).not.toBe(encrypt('x'));
	});

	it('throws on tampered ciphertext (native GCM error, not wrapped)', () => {
		const blob = encrypt('secret data');
		const b64 = blob.slice('v1:'.length);
		const raw = Buffer.from(b64, 'base64');
		const tampered = Buffer.from(raw);
		const firstCipherByte = 12 + 16;
		tampered[firstCipherByte] ^= 0x01;
		const badBlob = `v1:${tampered.toString('base64')}`;
		expect(() => decrypt(badBlob)).toThrow();
	});

	it('throws a clear key error when the env var is missing', () => {
		delete process.env.ORG_CONFIG_ENCRYPTION_KEY;
		const longBlob = `v1:${Buffer.alloc(29, 0).toString('base64')}`;
		expect(() => encrypt('x')).toThrowError(keyError);
		expect(() => decrypt(longBlob)).toThrowError(keyError);
	});

	it('throws the same key error when the key decodes to the wrong length', () => {
		process.env.ORG_CONFIG_ENCRYPTION_KEY = Buffer.alloc(16, 1).toString('base64');
		const longBlob = `v1:${Buffer.alloc(29, 0).toString('base64')}`;
		expect(() => encrypt('x')).toThrowError(keyError);
		expect(() => decrypt(longBlob)).toThrowError(keyError);
	});

	it('throws BadOrgConfigBlobError for an unknown version prefix', () => {
		try {
			decrypt('v2:abc');
			expect(true).toBe(false);
		} catch (err) {
			expect(err).toBeInstanceOf(BadOrgConfigBlobError);
		}
	});
});
