declare module 'jsonld-signatures/KeyObject' {
	interface BaseKeyObject {
		id: string;
	}

	interface SignerKeyObject extends BaseKeyObject {
		signer: { sign: Promise };
		verifier?: never;
	}

	interface VerifierKeyObject extends BaseKeyObject {
		signer?: never;
		verifier: { verify: Promise };
	}

	type KeyObject = SignerKeyObject | VerifierKeyObject;
	export = KeyObject;
}

declare module 'jsonld-signatures/ProofChain' {
	export = ProofChain;
	class ProofChain {}
}
declare module 'jsonld-signatures/ProofSet' {
	export = ProofSet;
	class ProofSet {
		/**
		 * Adds a Linked Data proof to a document. If the document contains other
		 * proofs, the new proof will be appended to the existing set of proofs.
		 *
		 * Important note: This method assumes that the term `proof` in the given
		 * document has the same definition as the `https://w3id.org/security/v2`
		 * JSON-LD @context.
		 *
		 * @param document {object} - JSON-LD Document to be signed.
		 * @param options {object} Options hashmap.
		 *
		 * A `suite` option is required:
		 *
		 * @param options.suite {LinkedDataSignature} a signature suite instance
		 *   that will create the proof.
		 *
		 * A `purpose` option is required:
		 *
		 * @param options.purpose {ProofPurpose} a proof purpose instance that will
		 *   augment the proof with information describing its intended purpose.
		 *
		 * Advanced optional parameters and overrides:
		 *
		 * @param [documentLoader] {function} a custom document loader,
		 *   `Promise<RemoteDocument> documentLoader(url)`.
		 *
		 * @return {Promise<object>} resolves with the signed document, with
		 *   the signature in the top-level `proof` property.
		 */
		add(
			document: object,
			{
				suite,
				purpose,
				documentLoader
			}?: {
				suite: LinkedDataSignature;
				purpose: ProofPurpose;
				documentLoader?: (url: string) => Promise<RemoteDocument>;
			}
		): Promise<object>;
		/**
		 * Verifies Linked Data proof(s) on a document. The proofs to be verified
		 * must match the given proof purpose.
		 *
		 * Important note: This method assumes that the term `proof` in the given
		 * document has the same definition as the `https://w3id.org/security/v2`
		 * JSON-LD @context.
		 *
		 * @param {object} document - The JSON-LD document with one or more proofs to
		 *   be verified.
		 *
		 * @param {LinkedDataSignature|LinkedDataSignature[]} suite -
		 *   Acceptable signature suite instances for verifying the proof(s).
		 *
		 * @param {ProofPurpose} purpose - A proof purpose instance that will
		 *   match proofs to be verified and ensure they were created according to
		 *   the appropriate purpose.
		 *
		 * Advanced optional parameters and overrides:
		 *
		 * @param {function} [documentLoader]  a custom document loader,
		 *   `Promise<RemoteDocument> documentLoader(url)`.
		 *
		 * @return {Promise<{verified: boolean, results: Array, error: *}>} resolves
		 *   with an object with a `verified`boolean property that is `true` if at
		 *   least one proof matching the given purpose and suite verifies and `false`
		 *   otherwise; a `results` property with an array of detailed results;
		 *   if `false` an `error` property will be present.
		 */
		verify(
			document: object,
			{
				suite,
				purpose,
				documentLoader
			}?: {
				suite: LinkedDataSignature | LinkedDataSignature[];
				purpose: ProofPurpose;
				documentLoader?: (url: string) => Promise<RemoteDocument>;
			}
		): Promise<{
			verified: boolean;
			results: any[];
			error: any;
		}>;
	}
}
declare module 'jsonld-signatures/VerificationError' {
	export = VerificationError;
	/**
	 * Used as an umbrella wrapper around multiple verification errors.
	 */
	class VerificationError extends Error {
		/**
		 * @param {Error|Error[]} errors
		 */
		constructor(errors: Error | Error[]);
		errors: any[];
	}
}
declare module 'jsonld-signatures/constants' {
	export const SECURITY_CONTEXT_URL: any;
	export const SECURITY_CONTEXT_V1_URL: any;
	export const SECURITY_CONTEXT_V2_URL: any;
	export const SECURITY_PROOF_URL: string;
	export const SECURITY_SIGNATURE_URL: string;
}
declare module 'jsonld-signatures/contexts' {
	const _exports: Map<any, any>;
	export = _exports;
}
declare module 'jsonld-signatures/documentLoader' {
	export function extendContextLoader(documentLoader: any): (url: any) => Function;
	export function strictDocumentLoader(url: any): Function;
}
declare module 'jsonld-signatures' {
	import VerificationError = require('jsonld-signatures/lib/VerificationError');
	/**
	 * Cryptographically signs the provided document by adding a `proof` section,
	 * based on the provided suite and proof purpose.
	 *
	 * @param {object} document - The JSON-LD document to be signed.
	 *
	 * @param {object} options - Options hashmap.
	 * @param {LinkedDataSignature} options.suite - The linked data signature
	 *   cryptographic suite, containing private key material, with which to sign
	 *   the document.
	 *
	 * @param {ProofPurpose} purpose - A proof purpose instance that will
	 *   match proofs to be verified and ensure they were created according to
	 *   the appropriate purpose.
	 *
	 * @param {function} documentLoader  - A secure document loader (it is
	 *   recommended to use one that provides static known documents, instead of
	 *   fetching from the web) for returning contexts, controller documents, keys,
	 *   and other relevant URLs needed for the proof.
	 *
	 * Advanced optional parameters and overrides:
	 *
	 * @param {function} [options.expansionMap] - NOT SUPPORTED; do not use.
	 * @param {boolean} [options.addSuiteContext=true] - Toggles the default
	 *   behavior of each signature suite enforcing the presence of its own
	 *   `@context` (if it is not present, it's added to the context list).
	 *
	 * @returns {Promise<object>} Resolves with signed document.
	 */
	export function sign(
		document: any,
		{
			suite,
			purpose,
			documentLoader,
			expansionMap,
			addSuiteContext
		}?: {
			suite: LinkedDataSignature;
			purpose: ProofPurpose;
			documentLoader: (url: string) => Promise<RemoteDocument>;
			addSuiteContext?: boolean;
		}
	): Promise<any>;
	/**
	 * Verifies the linked data signature on the provided document.
	 *
	 * @param {object} document - The JSON-LD document with one or more proofs to be
	 *   verified.
	 *
	 * @param {object} options - The options to use.
	 * @param {LinkedDataSignature|LinkedDataSignature[]} options.suite -
	 *   Acceptable signature suite instances for verifying the proof(s).
	 *
	 * @param {ProofPurpose} purpose - A proof purpose instance that will
	 *   match proofs to be verified and ensure they were created according to
	 *   the appropriate purpose.
	 *
	 * Advanced optional parameters and overrides:
	 *
	 * @param {function} [options.documentLoader]  - A custom document loader,
	 *   `Promise<RemoteDocument> documentLoader(url)`.
	 * @param {function} [options.expansionMap] - NOT SUPPORTED; do not use.
	 *
	 * @return {Promise<{verified: boolean, results: Array,
	 *   error: VerificationError}>}
	 *   resolves with an object with a `verified` boolean property that is `true`
	 *   if at least one proof matching the given purpose and suite verifies and
	 *   `false` otherwise; a `results` property with an array of detailed results;
	 *   if `false` an `error` property will be present, with `error.errors`
	 *   containing all of the errors that occurred during the verification process.
	 */
	export function verify(
		document: any,
		{
			suite,
			purpose,
			documentLoader,
			expansionMap
		}?: {
			suite: any;
			purpose: ProofPurpose;
			documentLoader?: (url: string) => Promise<RemoteDocument>;
		}
	): Promise<{
		verified: boolean;
		results: any[];
		error: VerificationError;
	}>;
	export const suites: {
		LinkedDataProof: {
			new ({ type }?: { type: any }): import('jsonld-signatures/lib/suites/LinkedDataProof');
		};
		LinkedDataSignature: {
			new ({
				type,
				proof,
				LDKeyClass,
				date,
				key,
				signer,
				verifier,
				useNativeCanonize,
				canonizeOptions,
				contextUrl
			}?: {
				type: string;
			}): import('jsonld-signatures/lib/suites/LinkedDataSignature');
		};
	};
	export const purposes: {
		AssertionProofPurpose: {
			new ({
				term,
				controller,
				date,
				maxTimestampDelta
			}?: {
				term?: string;
				controller: any;
				date: any;
				maxTimestampDelta?: number;
			}): import('jsonld-signatures/lib/purposes/AssertionProofPurpose');
		};
		AuthenticationProofPurpose: {
			new ({
				term,
				controller,
				challenge,
				date,
				domain,
				maxTimestampDelta
			}?: {
				term?: string;
				controller: any;
				challenge: any;
				date: any;
				domain: any;
				maxTimestampDelta?: number;
			}): import('jsonld-signatures/lib/purposes/AuthenticationProofPurpose');
		};
		ControllerProofPurpose: {
			new ({
				term,
				controller,
				date,
				maxTimestampDelta
			}?: string): import('jsonld-signatures/lib/purposes/ControllerProofPurpose');
		};
		ProofPurpose: {
			new ({
				term,
				date,
				maxTimestampDelta
			}?: string): import('jsonld-signatures/lib/purposes/ProofPurpose');
		};
	};

	// these are actually auto assigned to this object in the loading of the main file of the lib
	export function extendContextLoader(documentLoader: any): (url: any) => Promise;
	export function strictDocumentLoader(url: any): Promise;
}
declare module 'jsonld-signatures/purposes' {
	export namespace purposes {
		const AssertionProofPurpose: {
			new ({
				term,
				controller,
				date,
				maxTimestampDelta
			}?: {
				term?: string;
				controller: any;
				date: any;
				maxTimestampDelta?: number;
			}): import('jsonld-signatures/lib/purposes/AssertionProofPurpose');
		};
		const AuthenticationProofPurpose: {
			new ({
				term,
				controller,
				challenge,
				date,
				domain,
				maxTimestampDelta
			}?: {
				term?: string;
				controller: any;
				challenge: any;
				date: any;
				domain: any;
				maxTimestampDelta?: number;
			}): import('jsonld-signatures/lib/purposes/AuthenticationProofPurpose');
		};
		const ControllerProofPurpose: {
			new ({
				term,
				controller,
				date,
				maxTimestampDelta
			}?: string): import('jsonld-signatures/lib/purposes/ControllerProofPurpose');
		};
		const ProofPurpose: {
			new ({
				term,
				date,
				maxTimestampDelta
			}?: string): import('jsonld-signatures/lib/purposes/ProofPurpose');
		};
	}
}
declare module 'jsonld-signatures/purposes/AssertionProofPurpose' {
	export = AssertionProofPurpose;
	class AssertionProofPurpose extends ControllerProofPurpose {
		constructor({
			term,
			controller,
			date,
			maxTimestampDelta
		}?: {
			term?: string;
			controller: any;
			date: any;
			maxTimestampDelta?: number;
		});
	}
	import ControllerProofPurpose = require('jsonld-signatures/lib/purposes/ControllerProofPurpose');
}
declare module 'jsonld-signatures/purposes/AuthenticationProofPurpose' {
	export = AuthenticationProofPurpose;
	class AuthenticationProofPurpose extends ControllerProofPurpose {
		constructor({
			term,
			controller,
			challenge,
			date,
			domain,
			maxTimestampDelta
		}?: {
			term?: string;
			controller: any;
			challenge: any;
			date: any;
			domain: any;
			maxTimestampDelta?: number;
		});
		challenge: string;
		domain: any;
		validate(
			proof: any,
			{
				verificationMethod,
				documentLoader,
				expansionMap
			}: {
				verificationMethod: any;
				documentLoader: any;
				expansionMap: any;
			}
		): Promise<{
			valid: boolean;
			error: any;
		}>;
		update(
			proof: any,
			{
				document,
				suite,
				documentLoader,
				expansionMap
			}: {
				document: any;
				suite: any;
				documentLoader: any;
				expansionMap: any;
			}
		): Promise<any>;
	}
	import ControllerProofPurpose = require('jsonld-signatures/lib/purposes/ControllerProofPurpose');
}
declare module 'jsonld-signatures/purposes/ControllerProofPurpose' {
	export = ControllerProofPurpose;
	class ControllerProofPurpose extends ProofPurpose {
		controller: any;
		_termDefinedByDIDContext: boolean;
		/**
		 * Validates the purpose of a proof. This method is called during
		 * proof verification, after the proof value has been checked against the
		 * given verification method (e.g. in the case of a digital signature, the
		 * signature has been cryptographically verified against the public key).
		 *
		 * @param proof
		 * @param verificationMethod
		 * @param documentLoader
		 * @param expansionMap
		 *
		 * @throws {Error} If verification method not authorized by controller
		 * @throws {Error} If proof's created timestamp is out of range
		 *
		 * @returns {Promise<{valid: boolean, error: Error}>}
		 */
		validate(
			proof: any,
			{
				verificationMethod,
				documentLoader,
				expansionMap
			}: {
				verificationMethod: any;
				documentLoader: any;
				expansionMap: any;
			}
		): Promise<{
			valid: boolean;
			error: Error;
		}>;
	}
	import ProofPurpose = require('jsonld-signatures/lib/purposes/ProofPurpose');
}
declare module 'jsonld-signatures/purposes/ProofPurpose' {
	export = ProofPurpose;
	class ProofPurpose {
		/**
		 * @param term {string} the `proofPurpose` term, as defined in the
		 *    SECURITY_CONTEXT_URL `@context` or a URI if not defined in such.
		 * @param [date] {string or Date or integer} the expected date for
		 *   the creation of the proof.
		 * @param [maxTimestampDelta] {integer} a maximum number of seconds that
		 *   the date on the signature can deviate from, defaults to `Infinity`.
		 */
		constructor({ term, date, maxTimestampDelta }?: string);
		term: any;
		date: Date;
		maxTimestampDelta: any;
		/**
		 * Called to validate the purpose of a proof. This method is called during
		 * proof verification, after the proof value has been checked against the
		 * given verification method (e.g. in the case of a digital signature, the
		 * signature has been cryptographically verified against the public key).
		 *
		 * @param proof {object} the proof, in the `constants.SECURITY_CONTEXT_URL`,
		 *   with the matching purpose to validate.
		 *
		 * @return {Promise<object>} resolves to an object with `valid` and `error`.
		 */
		validate(
			proof: object,
			{
				expansionMap
			}: {
				expansionMap: any;
			}
		): Promise<object>;
		/**
		 * Called to update a proof when it is being created, adding any properties
		 * specific to this purpose. This method is called prior to the proof
		 * value being generated such that any properties added may be, for example,
		 * included in a digital signature value.
		 *
		 * @param proof {object} the proof, in the `constants.SECURITY_CONTEXT_URL`
		 *   to update.
		 *
		 * @return {Promise<object>} resolves to the proof instance (in the
		 *   `constants.SECURITY_CONTEXT_URL`.
		 */
		update(
			proof: object,
			{
				expansionMap
			}: {
				expansionMap: any;
			}
		): Promise<object>;
		/**
		 * Determines if the given proof has a purpose that matches this instance,
		 * i.e. this ProofPurpose instance should be used to validate the given
		 * proof.
		 *
		 * @param proof {object} the proof to check.
		 *
		 * @return {Promise<boolean>} `true` if there's a match, `false` if not.
		 */
		match(
			proof: object,
			{
				expansionMap
			}: {
				expansionMap: any;
			}
		): Promise<boolean>;
	}
}
declare module 'jsonld-signatures/sha256digest-browser' {
	/**
	 * Hashes a string of data using SHA-256.
	 *
	 * @param {string} string - the string to hash.
	 *
	 * @return {Uint8Array} the hash digest.
	 */
	export function sha256digest({ string }: string): Uint8Array;
}
declare module 'jsonld-signatures/sha256digest' {
	/**
	 * Hashes a string of data using SHA-256.
	 *
	 * @param {string} string - the string to hash.
	 *
	 * @return {Uint8Array} the hash digest.
	 */
	export function sha256digest({ string }: string): Uint8Array;
}
declare module 'jsonld-signatures/suites' {
	export namespace suites {
		const LinkedDataProof: {
			new ({ type }?: { type: any }): import('jsonld-signatures/lib/suites/LinkedDataProof');
		};
		const LinkedDataSignature: {
			new ({
				type,
				proof,
				LDKeyClass,
				date,
				key,
				signer,
				verifier,
				useNativeCanonize,
				canonizeOptions,
				contextUrl
			}?: {
				type: string;
				proof?: any;
				LDKeyClass: any;
				date?: string | Date;
				key?: import('jsonld-signatures/KeyObject');
				signer?: { sign: Promise; id: string };
				verifier?: { verify: Promise; id: string };
				useNativeCanonize?: boolean;
				canonizeOptions?: any;
				contextUrl: string;
			}): import('jsonld-signatures/lib/suites/LinkedDataSignature');
		};
	}
}
declare module 'jsonld-signatures/suites/LinkedDataProof' {
	export = LinkedDataProof;
	class LinkedDataProof {
		constructor({ type }?: { type: any });
		type: string;
		/**
		 * @param {object} options - The options to use.
		 * @param {object} options.document - The document to be signed.
		 * @param {ProofPurpose} options.purpose - The proof purpose instance.
		 * @param {function} options.documentLoader - The document loader to use.
		 * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
		 *
		 * @returns {Promise<object>} Resolves with the created proof object.
		 */
		createProof({}: {
			document: object;
			purpose: ProofPurpose;
			documentLoader: Function;
			expansionMap: Function;
		}): Promise<object>;
		/**
		 * @param {object} options - The options to use.
		 * @param {object} options.proof - The proof to be verified.
		 * @param {object} options.document - The document the proof applies to.
		 * @param {ProofPurpose} options.purpose - The proof purpose instance.
		 * @param {function} options.documentLoader - The document loader to use.
		 * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
		 *
		 * @returns {Promise<{object}>} Resolves with the verification result.
		 */
		verifyProof({}: {
			proof: object;
			document: object;
			purpose: ProofPurpose;
			documentLoader: Function;
			expansionMap: Function;
		}): Promise<{
			object;
		}>;
		/**
		 * Checks whether a given proof exists in the document.
		 *
		 * @param {object} options - The options to use.
		 * @param {object} options.proof - The proof to match.
		 *
		 * @returns {Promise<boolean>} Whether a match for the proof was found.
		 */
		matchProof({ proof }: { proof: object }): Promise<boolean>;
	}
}
declare module 'jsonld-signatures/suites/LinkedDataSignature' {
	export = LinkedDataSignature;
	class LinkedDataSignature extends LinkedDataProof {
		/**
		 * Parent class from which the various LinkDataSignature suites (such as
		 * `Ed25519Signature2020`) inherit.
		 * NOTE: Developers are never expected to use this class directly, but to
		 * only work with individual suites.
		 *
		 * @param {object} options - Options hashmap.
		 * @param {string} options.type - Suite name, provided by subclass.
		 * @typedef LDKeyPair
		 * @param {LDKeyPair} LDKeyClass - The crypto-ld key class that this suite
		 *   will use to sign/verify signatures. Provided by subclass. Used
		 *   during the `verifySignature` operation, to create an instance (containing
		 *   a `verifier()` property) of a public key fetched via a `documentLoader`.
		 *
		 * @param {string} contextUrl - JSON-LD context URL that corresponds to this
		 *   signature suite. Provided by subclass. Used for enforcing suite context
		 *   during the `sign()` operation.
		 *
		 * For `sign()` operations, either a `key` OR a `signer` is required.
		 * For `verify()` operations, you can pass in a verifier (from KMS), or
		 * the public key will be fetched via documentLoader.
		 *
		 * @param {object} [options.key] - An optional key object (containing an
		 *   `id` property, and either `signer` or `verifier`, depending on the
		 *   intended operation. Useful for when the application is managing keys
		 *   itself (when using a KMS, you never have access to the private key,
		 *   and so should use the `signer` param instead).
		 *
		 * @param {{sign: Function, id: string}} [options.signer] - Signer object
		 *   that has two properties: an async `sign()` method, and an `id`. This is
		 *   useful when interfacing with a KMS (since you don't get access to the
		 *   private key and its `signer`, the KMS client gives you only the signer
		 *   object to use).
		 *
		 * @param {{verify: Function, id: string}} [options.verifier] - Verifier
		 *   object that has two properties: an async `verify()` method, and an `id`.
		 *   Useful when working with a KMS-provided verifier.
		 *
		 * Advanced optional parameters and overrides:
		 *
		 * @param {object} [options.proof] - A JSON-LD document with options to use
		 *   for the `proof` node (e.g. any other custom fields can be provided here
		 *   using a context different from security-v2). If not provided, this is
		 *   constructed during signing.
		 * @param {string|Date} [options.date] - Signing date to use (otherwise
		 *   defaults to `now()`).
		 * @param {boolean} [options.useNativeCanonize] - Whether to use a native
		 *   canonize algorithm.
		 * @param {object} [options.canonizeOptions] - Options to pass to
		 *   canonize algorithm.
		 */
		constructor({
			type,
			proof,
			LDKeyClass,
			date,
			key,
			signer,
			verifier,
			useNativeCanonize,
			canonizeOptions,
			contextUrl
		}?: {
			type: string;
			proof?: any;
			LDKeyClass: any;
			date?: string | Date;
			key?: import('jsonld-signatures/KeyObject');
			signer?: { sign: Promise; id: string };
			verifier?: { verify: Promise; id: string };
			useNativeCanonize?: boolean;
			canonizeOptions?: any;
			contextUrl: string;
		});
		LDKeyClass: any;
		contextUrl: any;
		proof: any;
		verificationMethod: string;
		key: any;
		signer: {
			sign: Function;
			id: string;
		};
		verifier: {
			verify: Function;
			id: string;
		};
		canonizeOptions: any;
		date: Date;
		useNativeCanonize: any;
		_hashCache: {
			document: any;
			hash: Promise<Uint8Array>;
		};
		/**
		 * @param {object} options - The options to use.
		 * @param {object} options.proof - The proof to be updated.
		 * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
		 *
		 * @returns {Promise<object>} Resolves with the created proof object.
		 */
		updateProof({
			proof,
			expansionMap
		}: {
			proof: object;
			expansionMap: Function;
		}): Promise<object>;
		canonize(
			input: any,
			{
				documentLoader,
				expansionMap,
				skipExpansion
			}: {
				documentLoader: any;
				expansionMap: any;
				skipExpansion: any;
			}
		): Promise<any>;
		canonizeProof(
			proof: any,
			{
				document,
				documentLoader,
				expansionMap
			}: {
				document: any;
				documentLoader: any;
				expansionMap: any;
			}
		): Promise<any>;
		/**
		 * @param {object} options - The options to use.
		 * @param {object} options.document - The document to be signed/verified.
		 * @param {object} options.proof - The proof to be verified.
		 * @param {function} options.documentLoader - The document loader to use.
		 * @param {function} options.expansionMap - NOT SUPPORTED; do not use.
		 *
		 * @returns {Promise<{Uint8Array}>}.
		 */
		createVerifyData({
			document,
			proof,
			documentLoader,
			expansionMap
		}: {
			document: object;
			proof: object;
			documentLoader: Function;
			expansionMap: Function;
		}): Promise<{
			Uint8Array;
		}>;
		/**
		 * @param document {object} to be signed.
		 * @param proof {object}
		 * @param documentLoader {function}
		 */
		getVerificationMethod({ proof, documentLoader }: object): Promise<any>;
		/**
		 * @param verifyData {Uint8Array}.
		 * @param document {object} to be signed.
		 * @param proof {object}
		 * @param documentLoader {function}
		 * @param expansionMap {function}
		 *
		 * @returns {Promise<{object}>} the proof containing the signature value.
		 */
		sign(): Promise<{
			object;
		}>;
		/**
		 * @param verifyData {Uint8Array}.
		 * @param verificationMethod {object}.
		 * @param document {object} to be signed.
		 * @param proof {object}
		 * @param documentLoader {function}
		 * @param expansionMap {function}
		 *
		 * @returns {Promise<boolean>}
		 */
		verifySignature(): Promise<boolean>;
		/**
		 * Ensures the document to be signed contains the required signature suite
		 * specific `@context`, by either adding it (if `addSuiteContext` is true),
		 * or throwing an error if it's missing.
		 *
		 * @param {object} options - Options hashmap.
		 * @param {object} options.document - JSON-LD document to be signed.
		 * @param {boolean} options.addSuiteContext - Add suite context?
		 */
		ensureSuiteContext({
			document,
			addSuiteContext
		}: {
			document: object;
			addSuiteContext: boolean;
		}): void;
	}
	import LinkedDataProof = require('jsonld-signatures/lib/suites/LinkedDataProof');
}
declare module 'jsonld-signatures/util' {
	/**
	 * Converts the given date into W3C datetime format (eg: 2011-03-09T21:55:41Z).
	 *
	 * @param date the date to convert.
	 *
	 * @return the date in W3C datetime format.
	 */
	export function w3cDate(date: any): string;
	/**
	 * Concatenates two Uint8Arrays.
	 *
	 * @param b1 {Uint8Array}.
	 * @param b2 {Uint8Array}.
	 *
	 * @return {Uint8Array} the result.
	 */
	export function concat(b1: Uint8Array, b2: Uint8Array): Uint8Array;
}
