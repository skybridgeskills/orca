import type { OAuthClient, Organization } from '@prisma/client';
import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import { prisma } from '$lib/../prisma/client';
import { hashSecret } from './secretHash';
import { generateOpaqueToken, CLIENT_SECRET_BYTES } from './tokens';
import {
	intersectSupported,
	parseScopeString,
	SCOPE_CREDENTIAL_READONLY,
	SCOPE_OFFLINE_ACCESS
} from './scopes';

/** RFC7591 registration error with an OAuth error code. */
export class RegistrationError extends Error {
	error: 'invalid_client_metadata' | 'invalid_redirect_uri';
	error_description: string;
	constructor(
		error: 'invalid_client_metadata' | 'invalid_redirect_uri',
		error_description: string
	) {
		super(error_description);
		this.name = 'RegistrationError';
		this.error = error;
		this.error_description = error_description;
	}
}

const GRANT_TYPES = ['authorization_code', 'refresh_token'] as const;
const RESPONSE_TYPES = ['code'] as const;

export interface NormalizedRegistration {
	clientName: string;
	clientUri: string;
	logoUri: string;
	tosUri: string;
	policyUri: string;
	redirectUris: string[];
	scopes: string[];
	grantTypes: string[];
	responseTypes: string[];
	tokenEndpointAuthMethod: string;
	contacts: string[];
	softwareId: string | null;
	softwareVersion: string | null;
}

/**
 * Validate an RFC7591 Dynamic Client Registration request body. Returns the
 * normalized fields used by `createClient`, or throws `RegistrationError`.
 */
export function validateRegistrationRequest(
	body: Record<string, unknown>,
	org: Organization
): NormalizedRegistration {
	// `org` is part of the signature for the Phase 4 caller and future per-org
	// registration policy; it carries no validation rules yet.
	void org;

	const clientName = requireString(body, 'client_name');
	const clientUri = requireString(body, 'client_uri');
	const logoUri = requireString(body, 'logo_uri');
	const tosUri = requireString(body, 'tos_uri');
	const policyUri = requireString(body, 'policy_uri');

	const redirectUris = requireStringArray(body, 'redirect_uris');
	if (redirectUris.length === 0) {
		throw new RegistrationError('invalid_redirect_uri', 'redirect_uris must be non-empty');
	}

	if (typeof body.scope !== 'string' || body.scope.length === 0) {
		throw new RegistrationError('invalid_client_metadata', 'scope is required');
	}

	// All *_uri and every redirect_uri MUST be https: and share a single host.
	// TODO(security): the only exception is http://localhost / 127.0.0.1 when
	// PUBLIC_HTTP_PROTOCOL === 'http' (local dev). Re-evaluate before exposing
	// registration to untrusted networks; never allow plain http in production.
	const metadataUris = [clientUri, logoUri, tosUri, policyUri];
	for (const uri of [...metadataUris, ...redirectUris]) {
		assertAllowedUrl(uri);
	}

	const hosts = new Set([...metadataUris, ...redirectUris].map((u) => new URL(u).host));
	if (hosts.size > 1) {
		throw new RegistrationError('invalid_client_metadata', 'all URLs must share the same host');
	}

	let scopes = intersectSupported(parseScopeString(body.scope));
	if (scopes.length === 0) {
		scopes = [SCOPE_CREDENTIAL_READONLY, SCOPE_OFFLINE_ACCESS];
	}

	const grantTypes = normalizeEnumArray(
		body.grant_types,
		GRANT_TYPES,
		['authorization_code'],
		'grant_types'
	);
	const responseTypes = normalizeEnumArray(
		body.response_types,
		RESPONSE_TYPES,
		['code'],
		'response_types'
	);

	const tokenEndpointAuthMethod =
		body.token_endpoint_auth_method === undefined
			? 'client_secret_basic'
			: body.token_endpoint_auth_method;
	if (tokenEndpointAuthMethod !== 'client_secret_basic') {
		throw new RegistrationError(
			'invalid_client_metadata',
			'token_endpoint_auth_method must be client_secret_basic'
		);
	}

	const contacts = Array.isArray(body.contacts)
		? body.contacts.filter((c): c is string => typeof c === 'string')
		: [];

	return {
		clientName,
		clientUri,
		logoUri,
		tosUri,
		policyUri,
		redirectUris,
		scopes,
		grantTypes,
		responseTypes,
		tokenEndpointAuthMethod,
		contacts,
		softwareId: typeof body.software_id === 'string' ? body.software_id : null,
		softwareVersion: typeof body.software_version === 'string' ? body.software_version : null
	};
}

/**
 * Persist a new USER_DELEGATED client. Generates the clientId/clientSecret and
 * stores only the scrypt hash of the secret. Returns the raw secret in memory.
 */
export async function createClient(
	org: Organization,
	normalized: NormalizedRegistration
): Promise<{ client: OAuthClient; clientSecret: string }> {
	const clientId = generateOpaqueToken(16);
	const clientSecret = generateOpaqueToken(CLIENT_SECRET_BYTES);

	const client = await prisma.oAuthClient.create({
		data: {
			organizationId: org.id,
			clientId,
			clientSecretHash: hashSecret(clientSecret),
			clientType: 'USER_DELEGATED',
			clientName: normalized.clientName,
			clientUri: normalized.clientUri,
			logoUri: normalized.logoUri,
			tosUri: normalized.tosUri,
			policyUri: normalized.policyUri,
			softwareId: normalized.softwareId,
			softwareVersion: normalized.softwareVersion,
			contacts: normalized.contacts,
			redirectUris: normalized.redirectUris,
			scopes: normalized.scopes,
			grantTypes: normalized.grantTypes,
			responseTypes: normalized.responseTypes,
			tokenEndpointAuthMethod: normalized.tokenEndpointAuthMethod,
			clientSecretExpiresAt: null
		}
	});

	return { client, clientSecret };
}

/** Shape an RFC7591 201 registration response body. */
export function toRegistrationResponse(client: OAuthClient, clientSecret: string) {
	return {
		client_id: client.clientId,
		client_secret: clientSecret,
		client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
		client_secret_expires_at: client.clientSecretExpiresAt
			? Math.floor(client.clientSecretExpiresAt.getTime() / 1000)
			: 0,
		client_name: client.clientName,
		client_uri: client.clientUri,
		logo_uri: client.logoUri,
		tos_uri: client.tosUri,
		policy_uri: client.policyUri,
		software_id: client.softwareId ?? undefined,
		software_version: client.softwareVersion ?? undefined,
		contacts: client.contacts,
		redirect_uris: client.redirectUris,
		grant_types: client.grantTypes,
		response_types: client.responseTypes,
		token_endpoint_auth_method: client.tokenEndpointAuthMethod,
		scope: client.scopes.join(' ')
	};
}

// --- private helpers ----------------------------------------------------------

function requireString(body: Record<string, unknown>, key: string): string {
	const value = body[key];
	if (typeof value !== 'string' || value.length === 0) {
		throw new RegistrationError('invalid_client_metadata', `${key} is required`);
	}
	return value;
}

function requireStringArray(body: Record<string, unknown>, key: string): string[] {
	const value = body[key];
	if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
		throw new RegistrationError('invalid_client_metadata', `${key} must be an array of strings`);
	}
	return value as string[];
}

function normalizeEnumArray(
	value: unknown,
	allowed: readonly string[],
	fallback: string[],
	key: string
): string[] {
	if (value === undefined) return fallback;
	if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
		throw new RegistrationError('invalid_client_metadata', `${key} must be an array of strings`);
	}
	for (const v of value as string[]) {
		if (!allowed.includes(v)) {
			throw new RegistrationError('invalid_client_metadata', `unsupported ${key}: ${v}`);
		}
	}
	return value as string[];
}

function assertAllowedUrl(raw: string): void {
	let url: URL;
	try {
		url = new URL(raw);
	} catch {
		throw new RegistrationError('invalid_redirect_uri', `invalid URL: ${raw}`);
	}

	if (url.protocol === 'https:') return;

	// Dev-only exception (see TODO(security) above).
	const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
	if (PUBLIC_HTTP_PROTOCOL === 'http' && url.protocol === 'http:' && isLocalhost) return;

	throw new RegistrationError('invalid_redirect_uri', `URL must be https: ${raw}`);
}
