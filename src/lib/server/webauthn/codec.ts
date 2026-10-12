// base64url ↔ Uint8Array helpers for the WebAuthn ↔ DB boundary. `@simplewebauthn`
// works with `Uint8Array` public keys; we persist them as base64url strings on the
// PASSKEY `Identifier.json`. Node's Buffer supports base64url directly.

export function bytesToBase64url(bytes: Uint8Array): string {
	return Buffer.from(bytes).toString('base64url');
}

export function base64urlToBytes(value: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(value, 'base64url');
	// Back the array with a plain ArrayBuffer (not ArrayBufferLike) so it satisfies
	// @simplewebauthn's `Uint8Array<ArrayBuffer>` parameter type (TS 5.7 typed arrays).
	const bytes = new Uint8Array(buf.byteLength);
	bytes.set(buf);
	return bytes;
}
