declare module '@digitalbazaar/ed25519-verification-key-2020/Ed25519VerificationKey2020' {
	export class Ed25519VerificationKey2020 {
		/**
		 * Creates an Ed25519 Key Pair from an existing serialized key pair.
		 *
		 * @param {object} options - Key pair options (see constructor).
		 * @example
		 * > const keyPair = await Ed25519VerificationKey2020.from({
		 * controller: 'did:ex:1234',
		 * type: 'Ed25519VerificationKey2020',
		 * publicKeyMultibase,
		 * privateKeyMultibase
		 * });
		 *
		 * @returns {Promise<Ed25519VerificationKey2020>} An Ed25519 Key Pair.
		 */
		static from(options: object): Promise<Ed25519VerificationKey2020>;
		/**
		 * Instance creation method for backwards compatibility with the
		 * `Ed25519VerificationKey2018` key suite.
		 *
		 * @see https://github.com/digitalbazaar/ed25519-verification-key-2018
		 * @typedef {object} Ed25519VerificationKey2018
		 * @param {Ed25519VerificationKey2018} keyPair - Ed25519 2018 suite key pair.
		 *
		 * @returns {Ed25519VerificationKey2020} - 2020 suite instance.
		 */
		static fromEd25519VerificationKey2018({ keyPair }?: any): Ed25519VerificationKey2020;
		/**
		 * Creates a key pair instance (public key only) from a JsonWebKey2020
		 * object.
		 *
		 * @see https://w3c-ccg.github.io/lds-jws2020/#json-web-key-2020
		 *
		 * @param {object} options - Options hashmap.
		 * @param {string} options.id - Key id.
		 * @param {string} options.type - Key suite type.
		 * @param {string} options.controller - Key controller.
		 * @param {object} options.publicKeyJwk - JWK object.
		 *
		 * @returns {Promise<Ed25519VerificationKey2020>} Resolves with key pair.
		 */
		static fromJsonWebKey2020({
			id,
			type,
			controller,
			publicKeyJwk
		}?: {
			id: string;
			type: string;
			controller: string;
			publicKeyJwk: object;
		}): Promise<Ed25519VerificationKey2020>;
		/**
		 * Generates a KeyPair with an optional deterministic seed.
		 *
		 * @param {object} [options={}] - Options hashmap.
		 * @param {Uint8Array} [options.seed] - A 32-byte array seed for a
		 *   deterministic key.
		 *
		 * @returns {Promise<Ed25519VerificationKey2020>} Resolves with generated
		 *   public/private key pair.
		 */
		static generate({
			seed,
			...keyPairOptions
		}?: {
			seed?: Uint8Array;
		}): Promise<Ed25519VerificationKey2020>;
		/**
		 * Creates an instance of Ed25519VerificationKey2020 from a key fingerprint.
		 *
		 * @param {object} options - Options hashmap.
		 * @param {string} options.fingerprint - Multibase encoded key fingerprint.
		 *
		 * @returns {Ed25519VerificationKey2020} Returns key pair instance (with
		 *   public key only).
		 */
		static fromFingerprint({ fingerprint }?: { fingerprint: string }): Ed25519VerificationKey2020;
		/**
		 * An implementation of the Ed25519VerificationKey2020 spec, for use with
		 * Linked Data Proofs.
		 *
		 * @see https://w3c-ccg.github.io/lds-ed25519-2020/#ed25519verificationkey2020
		 * @see https://github.com/digitalbazaar/jsonld-signatures
		 *
		 * @param {object} options - Options hashmap.
		 * @param {string} options.controller - Controller DID or document url.
		 * @param {string} [options.id] - The key ID. If not provided, will be
		 *   composed of controller and key fingerprint as hash fragment.
		 * @param {string} options.publicKeyMultibase - Multibase encoded public key
		 *   with a multicodec ed25519-pub varint header [0xed, 0x01].
		 * @param {string} [options.privateKeyMultibase] - Multibase private key
		 *   with a multicodec ed25519-priv varint header [0x80, 0x26].
		 * @param {string} [options.revoked] - Timestamp of when the key has been
		 *   revoked, in RFC3339 format. If not present, the key itself is considered
		 *   not revoked. Note that this mechanism is slightly different than DID
		 *   Document key revocation, where a DID controller can revoke a key from
		 *   that DID by removing it from the DID Document.
		 */
		constructor(options?: {
			controller: string;
			id?: string;
			publicKeyMultibase: string;
			privateKeyMultibase?: string;
			revoked?: string;
		});
		type: string;
		publicKeyMultibase: string;
		privateKeyMultibase: string;
		id: string;
		/**
		 * @returns {Uint8Array} Public key bytes.
		 */
		get _publicKeyBuffer(): Uint8Array;
		/**
		 * @returns {Uint8Array} Private key bytes.
		 */
		get _privateKeyBuffer(): Uint8Array;
		/**
		 * Generates and returns a multiformats encoded
		 * ed25519 public key fingerprint (for use with cryptonyms, for example).
		 *
		 * @see https://github.com/multiformats/multicodec
		 *
		 * @returns {string} The fingerprint.
		 */
		fingerprint(): string;
		/**
		 * Exports the serialized representation of the KeyPair
		 * and other information that JSON-LD Signatures can use to form a proof.
		 *
		 * @param {object} [options={}] - Options hashmap.
		 * @param {boolean} [options.publicKey] - Export public key material?
		 * @param {boolean} [options.privateKey] - Export private key material?
		 * @param {boolean} [options.includeContext] - Include JSON-LD context?
		 *
		 * @returns {object} A plain js object that's ready for serialization
		 *   (to JSON, etc), for use in DIDs, Linked Data Proofs, etc.
		 */
		export({
			publicKey,
			privateKey,
			includeContext
		}?: {
			publicKey?: boolean;
			privateKey?: boolean;
			includeContext?: boolean;
		}): object;
		/**
		 * Returns the JWK representation of this key pair.
		 *
		 * @see https://datatracker.ietf.org/doc/html/rfc8037
		 *
		 * @param {object} [options={}] - Options hashmap.
		 * @param {boolean} [options.publicKey] - Include public key?
		 * @param {boolean} [options.privateKey] - Include private key?
		 *
		 * @returns {{kty: string, crv: string, x: string, d: string}} JWK
		 *   representation.
		 */
		toJwk({ publicKey, privateKey }?: { publicKey?: boolean; privateKey?: boolean }): {
			kty: string;
			crv: string;
			x: string;
			d: string;
		};
		/**
		 * @see https://datatracker.ietf.org/doc/html/rfc8037#appendix-A.3
		 *
		 * @returns {Promise<string>} JWK Thumbprint.
		 */
		jwkThumbprint(): Promise<string>;
		/**
		 * Returns the JsonWebKey2020 representation of this key pair.
		 *
		 * @see https://w3c-ccg.github.io/lds-jws2020/#json-web-key-2020
		 *
		 * @returns {Promise<object>} JsonWebKey2020 representation.
		 */
		toJsonWebKey2020(): Promise<object>;
		/**
		 * Tests whether the fingerprint was generated from a given key pair.
		 *
		 * @example
		 * > edKeyPair.verifyFingerprint({fingerprint: 'z6Mk2S2Q...6MkaFJewa'});
		 * {valid: true};
		 *
		 * @param {object} options - Options hashmap.
		 * @param {string} options.fingerprint - A public key fingerprint.
		 *
		 * @returns {{valid: boolean, error: *}} Result of verification.
		 */
		verifyFingerprint({ fingerprint }?: { fingerprint: string }): {
			valid: boolean;
			error: any;
		};
		signer(): {
			sign({ data }: { data: any }): Promise<Buffer>;
			id: string;
		};
		verifier(): {
			verify({ data, signature }: { data: any; signature: any }): Promise<boolean>;
			id: string;
		};
	}
	export namespace Ed25519VerificationKey2020 {
		export { SUITE_ID as suite };
		export const SUITE_CONTEXT: string;
	}
	const SUITE_ID: 'Ed25519VerificationKey2020';
	export {};
}

declare module '@digitalbazaar/ed25519-verification-key-2020/validators' {
	/*!
	 * Copyright (c) 2022 Digital Bazaar, Inc. All rights reserved.
	 */
	/**
	 * Asserts that key bytes have a type of Uint8Array and a specific length.
	 *
	 * @throws {TypeError|SyntaxError} - Throws a Type or Syntax error.
	 *
	 * @param {object} options - Options to use.
	 * @param {Uint8Array} options.bytes - The bytes being checked.
	 * @param {number} [options.expectedLength=32] - The expected bytes length.
	 * @param {string} [options.code] - An optional code for the error.
	 *
	 * @returns {undefined} Returns on success throws on error.
	 */
	export function assertKeyBytes({
		bytes,
		expectedLength,
		code
	}: {
		bytes: Uint8Array;
		expectedLength?: number;
		code?: string;
	}): undefined;
}

declare module '@digitalbazaar/ed25519-verification-key-2020/ed25519' {
	export default api;
	namespace api {
		/**
		 * Generates a key using a 32 byte Uint8Array.
		 *
		 * @param {Uint8Array} seedBytes - The bytes for the private key.
		 *
		 * @returns {object} The object with the public and private key material.
		 */
		function generateKeyPairFromSeed(seedBytes: Uint8Array): any;
		function generateKeyPair(): Promise<any>;
		function sign(privateKeyBytes: any, data: any): Promise<Buffer>;
		function verify(publicKeyBytes: any, data: any, signature: any): Promise<boolean>;
		function sha256digest({ data }: { data: any }): Promise<Buffer>;
	}
}

declare module '@digitalbazaar/ed25519-verification-key-2020/ed25519-browser' {
	namespace _default {
		export function generateKeyPair(): Promise<{
			publicKey: Uint8Array;
			secretKey: Uint8Array;
		}>;
		export { generateKeyPairFromSeed };
		export function sign(secretKey: any, data: any): Promise<Uint8Array>;
		export function verify(publicKey: any, data: any, signature: any): Promise<boolean>;
		export function sha256digest({ data }: { data: any }): Promise<ArrayBuffer>;
	}
	export default _default;
	function generateKeyPairFromSeed(seed: any): Promise<{
		publicKey: Uint8Array;
		secretKey: Uint8Array;
	}>;
}

declare module '@digitalbazaar/ed25519-verification-key-2020' {
	export { Ed25519VerificationKey2020 } from '@digitalbazaar/ed25519-verification-key-2020/Ed25519VerificationKey2020';
}
