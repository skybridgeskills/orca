import { DataIntegrityProof } from '@interop/data-integrity-proof';
import { Ed25519Signature2020 } from '@interop/ed25519-signature/ed25519-signature-2020';
import { eddsaRdfc2022 } from '@interop/ed25519-signature/eddsa-rdfc-2022';
import jsigs from '@interop/jsonld-signatures';

import { verificationDocumentLoader } from './documentLoader';

export type DidAuthErrorCode =
	| 'invalid_request'
	| 'missing_proof'
	| 'invalid_signature'
	| 'challenge_mismatch'
	| 'domain_mismatch'
	| 'invalid_proof_purpose'
	| 'unsupported_did_method'
	| 'holder_mismatch';

/** A rejected DID-auth presentation. `message` is safe to show a user. */
export class DidAuthError extends Error {
	code: DidAuthErrorCode;
	constructor(code: DidAuthErrorCode, message: string, options?: { cause?: unknown }) {
		super(message, options);
		this.name = 'DidAuthError';
		this.code = code;
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] =>
	value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

const idOf = (value: unknown): string | undefined => {
	if (typeof value === 'string') return value;
	if (isObject(value) && typeof value.id === 'string') return value.id;
	return undefined;
};

/** Wallets POST either a VC-API envelope (`{ verifiablePresentation }`) or a bare VP. */
function unwrapPresentation(body: unknown): JsonObject {
	if (!isObject(body)) {
		throw new DidAuthError('invalid_request', 'Request body must be a JSON object.');
	}
	const candidate = 'verifiablePresentation' in body ? body.verifiablePresentation : body;
	if (!isObject(candidate) || !asArray(candidate.type).includes('VerifiablePresentation')) {
		throw new DidAuthError(
			'invalid_request',
			'Request does not contain a verifiable presentation.'
		);
	}
	return candidate;
}

function selectProof(presentation: JsonObject): JsonObject {
	const proofs = asArray(presentation.proof);
	if (proofs.length === 0) {
		throw new DidAuthError('missing_proof', 'Presentation is not signed.');
	}
	if (!proofs.every(isObject)) {
		throw new DidAuthError('invalid_request', 'Presentation proof is malformed.');
	}
	if (proofs.length === 1) return proofs[0];

	const authProofs = proofs.filter((proof) => proof.proofPurpose === 'authentication');
	if (authProofs.length === 0) {
		throw new DidAuthError('missing_proof', 'Presentation has no authentication proof.');
	}
	if (authProofs.length > 1) {
		throw new DidAuthError(
			'invalid_request',
			'Presentation has more than one authentication proof.'
		);
	}
	return authProofs[0];
}

const domainMatches = (proofDomain: unknown, domain: string) =>
	proofDomain === domain || (Array.isArray(proofDomain) && proofDomain.includes(domain));

/**
 * Verifies a DID-auth presentation POSTed by a wallet and returns the DID that signed it.
 * Embedded credentials are not verified; a DID-auth VP normally carries none.
 *
 * @throws {DidAuthError} with a stable `code` when the presentation is rejected.
 */
export async function verifyDidAuthPresentation(input: {
	body: unknown;
	challenge: string;
	domain: string;
}): Promise<{ holderDid: string; presentation: Record<string, unknown> }> {
	const { challenge, domain } = input;
	const presentation = unwrapPresentation(input.body);
	const proof = selectProof(presentation);

	if (proof.proofPurpose !== 'authentication') {
		throw new DidAuthError(
			'invalid_proof_purpose',
			'Presentation proof is not for authentication.'
		);
	}

	const verificationMethod = idOf(proof.verificationMethod);
	if (!verificationMethod) {
		throw new DidAuthError('invalid_request', 'Presentation proof has no verification method.');
	}
	// Checked before verifying so that no other DID method is ever resolved.
	const holderDid = verificationMethod.split('#')[0];
	if (!holderDid.startsWith('did:key:')) {
		throw new DidAuthError('unsupported_did_method', 'Only did:key holders are supported.');
	}

	// `@interop/vc`'s `verify()` also verifies every embedded credential, which a DID-auth
	// check must ignore, so the presentation proof is verified with jsonld-signatures directly.
	const result = await jsigs.verify(presentation, {
		suite: [new Ed25519Signature2020(), new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 })],
		purpose: new jsigs.purposes.AuthenticationProofPurpose({
			term: 'authentication',
			challenge,
			domain
		}),
		documentLoader: verificationDocumentLoader
	});

	if (!result.verified) {
		// jsonld-signatures only validates the purpose (challenge, domain, controller) after
		// the signature checks out, and records `purposeResult` when it does.
		const purposeFailure = result.results
			?.map((proofResult) => proofResult.purposeResult)
			.find((purposeResult) => purposeResult && !purposeResult.valid);
		if (purposeFailure) {
			if (proof.challenge !== challenge) {
				throw new DidAuthError('challenge_mismatch', 'Presentation challenge does not match.');
			}
			if (!domainMatches(proof.domain, domain)) {
				throw new DidAuthError('domain_mismatch', 'Presentation domain does not match.');
			}
			throw new DidAuthError('invalid_proof_purpose', 'Presentation proof purpose is invalid.', {
				cause: purposeFailure.error
			});
		}
		throw new DidAuthError('invalid_signature', 'Presentation signature is invalid.', {
			cause: result.error
		});
	}

	const assertedHolder = idOf(presentation.holder);
	if (assertedHolder !== undefined && assertedHolder !== holderDid) {
		throw new DidAuthError('holder_mismatch', 'Presentation holder does not match the signer.');
	}

	return { holderDid, presentation };
}
