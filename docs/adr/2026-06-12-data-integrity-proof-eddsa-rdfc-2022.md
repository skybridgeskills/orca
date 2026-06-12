# Default credential proof: DataIntegrityProof / eddsa-rdfc-2022

- Status: Accepted
- Date: 2026-06-12
- Deciders: ORCA maintainers

## Context

ORCA signed achievement credentials with the legacy `Ed25519Signature2020`
linked-data signature (a distinct proof `type`, requiring the
`…/suites/ed25519-2020/v1` context appended to every signed credential's
`@context`). The OB3 / W3C VC 2.0 direction is `DataIntegrityProof` with a named
**cryptosuite** (`proof.type: 'DataIntegrityProof'`, `proof.cryptosuite:
'eddsa-rdfc-2022'`). The `@interop/*` package family already installed everything
needed for the newer suite; the legacy suite is the only thing keeping the wire
format old. Existing, already-issued credentials must remain verifiable.

The signing key is published in the org's `did:web` document
(`/.well-known/did.json`). A proof's `verificationMethod` must resolve to a method
in that document.

## Decision

1. **Sign new credentials with `DataIntegrityProof` / `eddsa-rdfc-2022`.** The
   `achievementClaimToCredential` signing path swaps the `Ed25519Signature2020` suite
   for `DataIntegrityProof({ signer, cryptosuite: eddsaRdfc2022 })`. New proofs carry
   `type: 'DataIntegrityProof'`, `cryptosuite: 'eddsa-rdfc-2022'`,
   `proofPurpose: 'assertionMethod'`, and a base58btc multibase `proofValue`.

2. **Drop the `ed25519-2020/v1` context injection from signed credentials.** With the
   VC 2.0 context present, `DataIntegrityProof.ensureSuiteContext` adds nothing, so a
   signed credential's `@context` is exactly the two OB3 template URLs.

3. **Publish dual verification methods in the DID document.** Each signing key now
   appears twice: the unchanged `#key-0` `Ed25519VerificationKey2020` method (so
   outstanding `Ed25519Signature2020` credentials still verify) **and** a new
   `#key-0-multikey` `Multikey` method. Both are listed in `assertionMethod`; the
   `…/multikey/v1` context is added to the document.

4. **The Multikey id (`#key-0-multikey`) is the proof creator for new credentials.**
   The signer reports `id: keyData.id`, so `proof.verificationMethod` is the Multikey
   identifier. The fragment is a fixed convention (parallel to the existing static
   `key-0`); the interop verifier resolves by `id`, so the fragment shape is free.

## Consequences

- **Public contract.** The DID document and the credential wire format are public,
  consumed by external verifiers. The `#key-0-multikey` id is permanent in every
  credential issued after this change. Both verification methods must stay published
  for as long as either credential vintage is in circulation.
- **Backward compatible verification.** Keeping `#key-0` /
  `Ed25519VerificationKey2020` and the `ED25519_V1` document-loader entry means
  previously-issued credentials remain verifiable; no re-signing is forced. Stale
  cached credentials regenerate via the existing `ensureClaimCredential` path.
- **Same key material.** Both methods publish the same `publicKeyMultibase`; this is a
  proof-format change, not a key rotation.
- The legacy `Ed25519Signature2020` suite is no longer used for signing but its
  context remains available for verification.

## Alternatives considered

- **Keep `Ed25519Signature2020`.** Rejected: it is the legacy linked-data signature;
  the OB3/VC 2.0 direction is DataIntegrityProof with a named cryptosuite.
- **`#<publicKeyMultibase>` (did:key fragment convention) for the Multikey id.**
  Rejected for consistency with ORCA's static `key-0` convention; the verifier
  resolves by id regardless.
- **Replace `#key-0` outright (single method).** Rejected — it would invalidate
  outstanding credentials.
- **`eddsa-jcs-2022` (JCS) variant.** Out of scope; `rdfc` matches the existing
  RDF-canonicalization document-loader setup.
