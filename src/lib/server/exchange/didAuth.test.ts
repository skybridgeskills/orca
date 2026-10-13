import { DataIntegrityProof } from '@interop/data-integrity-proof';
import { Ed25519Signature2020 } from '@interop/ed25519-signature/ed25519-signature-2020';
import { eddsaRdfc2022 } from '@interop/ed25519-signature/eddsa-rdfc-2022';
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';
import jsigs from '@interop/jsonld-signatures';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { localContextUrls } from '$lib/credentials/documentLoader';

import { DidAuthError, verifyDidAuthPresentation, type DidAuthErrorCode } from './didAuth';
import { verificationDocumentLoader } from './documentLoader';

const CHALLENGE = 'b1c2d3e4-challenge';
const DOMAIN = 'https://badgistan.orcapods.org';

const V2_ED25519_CONTEXT = [localContextUrls.CREDENTIALS_V2, localContextUrls.ED25519_V1];
const V1_ED25519_CONTEXT = [localContextUrls.CREDENTIALS_V1, localContextUrls.ED25519_V1];

type Holder = { did: string; key: Ed25519VerificationKey };

async function makeHolder(): Promise<Holder> {
	const key = await Ed25519VerificationKey.generate();
	const fingerprint = key.fingerprint();
	const did = `did:key:${fingerprint}`;
	key.id = `${did}#${fingerprint}`;
	key.controller = did;
	return { did, key };
}

async function signVp({
	key,
	context = V2_ED25519_CONTEXT,
	holder,
	suite = 'Ed25519Signature2020',
	challenge = CHALLENGE,
	domain = DOMAIN
}: {
	key: Ed25519VerificationKey;
	context?: string[];
	holder?: unknown;
	suite?: 'Ed25519Signature2020' | 'eddsa-rdfc-2022';
	challenge?: string;
	domain?: string;
}): Promise<Record<string, unknown>> {
	const signer = key.signer();
	const signingSuite =
		suite === 'Ed25519Signature2020'
			? new Ed25519Signature2020({ signer })
			: new DataIntegrityProof({ signer, cryptosuite: eddsaRdfc2022 });
	const presentation: Record<string, unknown> = {
		'@context': context,
		type: ['VerifiablePresentation']
	};
	if (holder !== undefined) presentation.holder = holder;
	return (await jsigs.sign(presentation, {
		suite: signingSuite,
		purpose: new jsigs.purposes.AuthenticationProofPurpose({
			term: 'authentication',
			challenge,
			domain
		}),
		documentLoader: verificationDocumentLoader
	})) as Record<string, unknown>;
}

async function expectRejection(body: unknown, code: DidAuthErrorCode) {
	const error = await verifyDidAuthPresentation({
		body,
		challenge: CHALLENGE,
		domain: DOMAIN
	}).then(
		() => undefined,
		(err: unknown) => err
	);
	expect(error).toBeInstanceOf(DidAuthError);
	expect((error as DidAuthError).code).toBe(code);
	return error as DidAuthError;
}

describe('verifyDidAuthPresentation', () => {
	let holder: Holder;
	const fetchSpy = vi.fn(() => Promise.reject(new Error('network access is not allowed in tests')));

	beforeAll(async () => {
		vi.stubGlobal('fetch', fetchSpy);
		holder = await makeHolder();
	});

	afterAll(() => {
		expect(fetchSpy).not.toHaveBeenCalled();
		vi.unstubAllGlobals();
	});

	it('accepts a wrapped Ed25519Signature2020 VP with VC v2 + ed25519-2020 contexts (LCW)', async () => {
		const vp = await signVp({ key: holder.key, holder: holder.did });

		const result = await verifyDidAuthPresentation({
			body: { verifiablePresentation: vp },
			challenge: CHALLENGE,
			domain: DOMAIN
		});

		expect(result.holderDid).toBe(holder.did);
		expect(result.presentation).toBe(vp);
	});

	it('accepts a bare VP', async () => {
		const vp = await signVp({ key: holder.key });

		const result = await verifyDidAuthPresentation({
			body: vp,
			challenge: CHALLENGE,
			domain: DOMAIN
		});

		expect(result.holderDid).toBe(holder.did);
	});

	it('accepts a DataIntegrityProof / eddsa-rdfc-2022 VP with the VC v2 context', async () => {
		const vp = await signVp({
			key: holder.key,
			context: [localContextUrls.CREDENTIALS_V2],
			suite: 'eddsa-rdfc-2022',
			holder: { id: holder.did }
		});
		expect((vp.proof as Record<string, unknown>).type).toBe('DataIntegrityProof');

		const result = await verifyDidAuthPresentation({
			body: { verifiablePresentation: vp },
			challenge: CHALLENGE,
			domain: DOMAIN
		});

		expect(result.holderDid).toBe(holder.did);
	});

	it('accepts a VC v1 context VP', async () => {
		const vp = await signVp({ key: holder.key, context: V1_ED25519_CONTEXT, holder: holder.did });

		const result = await verifyDidAuthPresentation({
			body: { verifiablePresentation: vp },
			challenge: CHALLENGE,
			domain: DOMAIN
		});

		expect(result.holderDid).toBe(holder.did);
	});

	it('rejects a wrong challenge', async () => {
		const vp = await signVp({ key: holder.key, challenge: 'some-other-challenge' });
		await expectRejection({ verifiablePresentation: vp }, 'challenge_mismatch');
	});

	it('rejects a wrong domain', async () => {
		const vp = await signVp({ key: holder.key, domain: 'https://evil.example' });
		await expectRejection({ verifiablePresentation: vp }, 'domain_mismatch');
	});

	it('rejects a VP tampered with after signing', async () => {
		const vp = await signVp({ key: holder.key });
		vp.id = 'urn:uuid:3f1c7a2e-0000-4000-8000-000000000000';
		await expectRejection({ verifiablePresentation: vp }, 'invalid_signature');
	});

	it('rejects a VP with no proof', async () => {
		const vp = { '@context': V2_ED25519_CONTEXT, type: ['VerifiablePresentation'] };
		await expectRejection({ verifiablePresentation: vp }, 'missing_proof');
	});

	it('rejects a top-level holder that differs from the signer', async () => {
		const other = await makeHolder();
		const vp = await signVp({ key: holder.key, holder: other.did });
		await expectRejection({ verifiablePresentation: vp }, 'holder_mismatch');
	});

	it('rejects a verification method that is not did:key', async () => {
		const { key } = await makeHolder();
		key.id = 'did:web:example.com#key-1';
		key.controller = 'did:web:example.com';
		const vp = await signVp({ key });
		await expectRejection({ verifiablePresentation: vp }, 'unsupported_did_method');
	});

	it.each([
		['a string', 'not a presentation'],
		['null', null],
		['an array', []],
		['an object without a VP', { foo: 'bar' }],
		['a wrapped non-VP', { verifiablePresentation: { type: ['VerifiableCredential'] } }]
	])('rejects %s as invalid_request', async (_label, body) => {
		await expectRejection(body, 'invalid_request');
	});

	it('keeps user-facing messages free of presentation and key material', async () => {
		const vp = await signVp({ key: holder.key });
		vp.id = 'urn:uuid:3f1c7a2e-0000-4000-8000-000000000001';
		const error = await expectRejection(vp, 'invalid_signature');
		const proofValue = (vp.proof as Record<string, unknown>).proofValue as string;

		expect(error.message).not.toContain(proofValue);
		expect(error.message).not.toContain(holder.key.fingerprint());
	});
});
