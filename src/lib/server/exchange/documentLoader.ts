import { driver, type KeyPairClass } from '@interop/did-method-key';
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';

import { extendedDocumentLoader } from '$lib/credentials/documentLoader';

const didKeyDriver = driver();
// did-method-key is typed against a newer @interop/data-integrity-core, whose
// `AbstractKeyPair.export()` is async; the app's v7 key returns synchronously. The driver
// awaits `export()`, so the v7 class is compatible at runtime.
didKeyDriver.use({ keyPairClass: Ed25519VerificationKey as unknown as KeyPairClass });

/**
 * Document loader for verifying wallet presentations. Kept separate from
 * `extendedDocumentLoader` so the signing path never resolves holder DIDs.
 *
 * did:key DIDs (and their `#fragment` verification methods) are derived locally from
 * the key itself, so this loader never makes a network request for them. Other URLs
 * fall through to `extendedDocumentLoader`, which serves bundled contexts and otherwise
 * uses jsonld-signatures' strict (network-free) loader.
 */
export const verificationDocumentLoader = async (url: string) => {
	if (url.startsWith('did:key:')) {
		const document = await didKeyDriver.get({ url });
		return {
			contextUrl: null,
			documentUrl: url,
			document,
			tag: 'static'
		};
	}
	return await extendedDocumentLoader(url);
};
