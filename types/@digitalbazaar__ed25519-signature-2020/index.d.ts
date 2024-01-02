declare module '@digitalbazaar/ed25519-signature-2020/Ed25519Signature2020' {
	export class Ed25519Signature2020 {
		/**
		 * @param {object} options - Options hashmap.
		 *
		 * Either a `key` OR at least one of `signer`/`verifier` is required:
		 *
		 * @param {object} [options.key] - An optional key object (containing an
		 *   `id` property, and either `signer` or `verifier`, depending on the
		 *   intended operation. Useful for when the application is managing keys
		 *   itself (when using a KMS, you never have access to the private key,
		 *   and so should use the `signer` param instead).
		 * @param {Function} [options.signer] - Signer function that returns an
		 *   object with an async sign() method. This is useful when interfacing
		 *   with a KMS (since you don't get access to the private key and its
		 *   `signer()`, the KMS client gives you only the signer function to use).
		 * @param {Function} [options.verifier] - Verifier function that returns
		 *   an object with an async `verify()` method. Useful when working with a
		 *   KMS-provided verifier function.
		 *
		 * Advanced optional parameters and overrides:
		 *
		 * @param {object} [options.proof] - A JSON-LD document with options to use
		 *   for the `proof` node (e.g. any other custom fields can be provided here
		 *   using a context different from security-v2).
		 * @param {string|Date} [options.date] - Signing date to use if not passed.
		 * @param {boolean} [options.useNativeCanonize] - Whether to use a native
		 *   canonize algorithm.
		 * @param {object} [options.canonizeOptions] - Options to pass to
		 *   canonize algorithm.
		 */
		constructor({
			key,
			signer,
			verifier,
			proof,
			date,
			useNativeCanonize,
			canonizeOptions
		}?: {
			key?: object;
			signer?: Function;
			verifier?: Function;
			proof?: object;
			date?: string | Date;
			useNativeCanonize?: boolean;
			canonizeOptions?: object;
		});
		requiredKeyType: string;
		/**
		 * Adds a signature (proofValue) field to the proof object. Called by
		 * LinkedDataSignature.createProof().
		 *
		 * @param {object} options - The options to use.
		 * @param {Uint8Array} options.verifyData - Data to be signed (extracted
		 *   from document, according to the suite's spec).
		 * @param {object} options.proof - Proof object (containing the proofPurpose,
		 *   verificationMethod, etc).
		 *
		 * @returns {Promise<object>} Resolves with the proof containing the signature
		 *   value.
		 */
		sign({ verifyData, proof }: { verifyData: Uint8Array; proof: object }): Promise<object>;
		/**
		 * Verifies the proof signature against the given data.
		 *
		 * @param {object} options - The options to use.
		 * @param {Uint8Array} options.verifyData - Canonicalized hashed data.
		 * @param {object} options.verificationMethod - Key object.
		 * @param {object} options.proof - The proof to be verified.
		 *
		 * @returns {Promise<boolean>} Resolves with the verification result.
		 */
		verifySignature({
			verifyData,
			verificationMethod,
			proof
		}: {
			verifyData: Uint8Array;
			verificationMethod: object;
			proof: object;
		}): Promise<boolean>;
		assertVerificationMethod({ verificationMethod }: { verificationMethod: any }): Promise<void>;
		getVerificationMethod({
			proof,
			documentLoader
		}: {
			proof: any;
			documentLoader: any;
		}): Promise<any>;
		matchProof({
			proof,
			document,
			purpose,
			documentLoader,
			expansionMap
		}: {
			proof: any;
			document: any;
			purpose: any;
			documentLoader: any;
			expansionMap: any;
		}): Promise<boolean>;
	}
	export namespace Ed25519Signature2020 {
		export { SUITE_CONTEXT_URL as CONTEXT_URL };
		export const CONTEXT: any;
	}
	const SUITE_CONTEXT_URL: any;
	export {};
}
declare module '@digitalbazaar/ed25519-signature-2020' {
	export { Ed25519Signature2020 } from './Ed25519Signature2020.js';
	export { suiteContext };
}
