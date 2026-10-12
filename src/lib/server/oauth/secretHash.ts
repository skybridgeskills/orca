import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

// scrypt cost params (N=2^14, r=8, p=1) — OWASP-recommended baseline; encoded
// into the stored string so they can be raised later without breaking old hashes.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;
const SALT_BYTES = 16;

/** Returns a self-describing hash: `scrypt$N$r$p$saltB64$hashB64`. */
export function hashSecret(raw: string): string {
	const salt = randomBytes(SALT_BYTES);
	const hash = scryptSync(raw, salt, KEYLEN, { N, r: R, p: P });
	return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

/** Constant-time verify against a stored `scrypt$...` string. Returns false on any malformed input. */
export function verifySecret(raw: string, stored: string): boolean {
	const parts = stored.split('$');
	if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
	const [, n, r, p, saltB64, hashB64] = parts;
	const salt = Buffer.from(saltB64, 'base64');
	const expected = Buffer.from(hashB64, 'base64');
	if (expected.length === 0) return false;
	const actual = scryptSync(raw, salt, expected.length, {
		N: Number(n),
		r: Number(r),
		p: Number(p)
	});
	return actual.length === expected.length && timingSafeEqual(actual, expected);
}
