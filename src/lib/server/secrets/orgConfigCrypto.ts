import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const VERSION_PREFIX = 'v1:';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const MIN_RAW_BYTES = IV_LENGTH + TAG_LENGTH + 1;

/**
 * Encrypts a UTF-8 string for storage in Organization.json (AES-256-GCM, `v1:` envelope).
 * @param plaintext - Secret value to encrypt
 * @returns Persisted blob: `v1:base64(iv ‖ tag ‖ ciphertext)`
 */
export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(IV_LENGTH);
	const cipher = createCipheriv('aes-256-gcm', key, iv);
	const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	const combined = Buffer.concat([iv, tag, ciphertext]);
	return `${VERSION_PREFIX}${combined.toString('base64')}`;
}

/**
 * Decrypts a v1 org config blob produced by {@link encrypt}.
 * @param blob - Value from org JSON
 * @returns Original plaintext
 */
export function decrypt(blob: string): string {
	if (!blob.startsWith(VERSION_PREFIX)) {
		throw new BadOrgConfigBlobError('Unsupported org config blob version');
	}
	const raw = Buffer.from(blob.slice(VERSION_PREFIX.length), 'base64');
	if (raw.length < MIN_RAW_BYTES) {
		throw new BadOrgConfigBlobError('Invalid org config blob: payload too short');
	}
	const iv = raw.subarray(0, IV_LENGTH);
	const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
	const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH);
	const key = getKey();
	const decipher = createDecipheriv('aes-256-gcm', key, iv);
	decipher.setAuthTag(tag);
	return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

/**
 * Thrown when an org config ciphertext blob is missing the expected v1 format or is truncated.
 */
export class BadOrgConfigBlobError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'BadOrgConfigBlobError';
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

function getKey(): Buffer {
	const b64 = process.env.ORG_CONFIG_ENCRYPTION_KEY;
	if (b64 === undefined || b64 === '') {
		throw new Error('ORG_CONFIG_ENCRYPTION_KEY must be 32 base64-encoded bytes');
	}
	const buf = Buffer.from(b64, 'base64');
	if (buf.length !== 32) {
		throw new Error('ORG_CONFIG_ENCRYPTION_KEY must be 32 base64-encoded bytes');
	}
	return buf;
}
