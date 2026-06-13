import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
	type AuthenticationResponseJSON,
	type RegistrationResponseJSON
} from '@simplewebauthn/server';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';

import { base64urlToBytes, bytesToBase64url } from './codec';
import type { StoredPasskey } from './passkeys';
import type { OrgRp } from './rp';

// Thin server-only wrappers over @simplewebauthn/server (v13). Verification ALWAYS
// happens here (never in client code), against the org-derived RP and the server-stored
// challenge. The mutable signature counter is returned to the caller to persist.

const textEncoder = new TextEncoder();

const asTransports = (t: string[] | undefined): AuthenticatorTransportFuture[] | undefined =>
	t as AuthenticatorTransportFuture[] | undefined;

/** Registration options for a logged-in user, excluding their existing passkeys. */
export async function buildRegistrationOptions(args: {
	rp: OrgRp;
	user: { id: string; name: string };
	existing: StoredPasskey[];
}) {
	return generateRegistrationOptions({
		rpName: args.rp.rpName,
		rpID: args.rp.rpID,
		userID: textEncoder.encode(args.user.id),
		userName: args.user.name,
		attestationType: 'none',
		excludeCredentials: args.existing.map((p) => ({
			id: p.credentialId,
			transports: asTransports(p.credential.transports)
		})),
		authenticatorSelection: {
			// Discoverable (resident) credential so login can be usernameless.
			residentKey: 'required',
			userVerification: 'preferred'
		}
	});
}

/** Verify a registration response; returns the credential to store, or null when invalid. */
export async function verifyRegistration(args: {
	rp: OrgRp;
	expectedChallenge: string;
	response: RegistrationResponseJSON;
}): Promise<{
	credentialId: string;
	publicKey: string; // base64url
	counter: number;
	transports?: string[];
	deviceType?: string;
	backedUp?: boolean;
} | null> {
	const verification = await verifyRegistrationResponse({
		response: args.response,
		expectedChallenge: args.expectedChallenge,
		expectedOrigin: args.rp.expectedOrigin,
		expectedRPID: args.rp.rpID
	});
	if (!verification.verified || !verification.registrationInfo) return null;
	const info = verification.registrationInfo;
	return {
		credentialId: info.credential.id,
		publicKey: bytesToBase64url(info.credential.publicKey),
		counter: info.credential.counter,
		transports: info.credential.transports,
		deviceType: info.credentialDeviceType,
		backedUp: info.credentialBackedUp
	};
}

/**
 * Authentication options. `allowed` empty → usernameless/discoverable login; non-empty
 * (the known user's credentials) → the superadmin 2FA step.
 */
export async function buildAuthenticationOptions(args: { rp: OrgRp; allowed?: StoredPasskey[] }) {
	return generateAuthenticationOptions({
		rpID: args.rp.rpID,
		userVerification: 'preferred',
		allowCredentials: (args.allowed ?? []).map((p) => ({
			id: p.credentialId,
			transports: asTransports(p.credential.transports)
		}))
	});
}

/** Verify an authentication assertion against a stored passkey; returns the new counter. */
export async function verifyAuthentication(args: {
	rp: OrgRp;
	expectedChallenge: string;
	response: AuthenticationResponseJSON;
	passkey: StoredPasskey;
}): Promise<{ newCounter: number } | null> {
	const verification = await verifyAuthenticationResponse({
		response: args.response,
		expectedChallenge: args.expectedChallenge,
		expectedOrigin: args.rp.expectedOrigin,
		expectedRPID: args.rp.rpID,
		credential: {
			id: args.passkey.credentialId,
			publicKey: base64urlToBytes(args.passkey.credential.publicKey),
			counter: args.passkey.credential.counter,
			transports: asTransports(args.passkey.credential.transports)
		}
	});
	if (!verification.verified) return null;
	return { newCounter: verification.authenticationInfo.newCounter };
}
