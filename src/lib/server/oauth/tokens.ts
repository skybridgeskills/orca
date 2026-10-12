import { randomBytes, createHash } from 'node:crypto';

export const ACCESS_TOKEN_TTL_SECONDS = 3600; // 1 hour (Q8)
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days (Q8)
export const AUTHORIZATION_CODE_TTL_SECONDS = 600; // 10 minutes (spec)
export const CLIENT_SECRET_BYTES = 32;
export const TOKEN_BYTES = 32;

/** URL-safe high-entropy opaque value. */
export function generateOpaqueToken(bytes = TOKEN_BYTES): string {
	return randomBytes(bytes).toString('base64url');
}

/** Deterministic sha256 hex for at-rest storage and lookup. */
export function hashToken(raw: string): string {
	return createHash('sha256').update(raw).digest('hex');
}

export function expiryFromNow(seconds: number): Date {
	return new Date(Date.now() + seconds * 1000);
}
