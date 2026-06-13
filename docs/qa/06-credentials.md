# 06 — Credentials

Validate **issuance** for an existing valid claim: the signed **OB3 Verifiable Credential**
(proof shape), the org **DID document**, the **OB2** hosted assertion, and the
**backpack / CHAPI** wallet path. This journey produces **no new state** — it confirms the
credential surfaces for state earned in journeys 4–5.

Do the [setup](./00-setup.md) first (the **issuer keypair** must exist — `createKeypair`),
and run after [04 — Claiming](./04-claiming.md) / [05](./05-invites-awards-reviews.md).
**Do not reset the database.**

## Preconditions

- A **valid** claim owned by the **_Member user_** (e.g. the _Member_ or _Gated_ claim from
  journey 4) — ACCEPTED with `validFrom` set.
- The org's **issuer signing key** exists (journey 0 `createKeypair`); without it,
  download/issue returns a 503 "issuer signing key is no longer available".
- To exercise the **public** OB2/OB3 emitter URLs, the claim's **visibility must be
  `PUBLIC`** (the public JSON surfaces 404 a non-public claim). Set claim visibility on the
  owner's `/claims/<id>` view if needed.

## A. View & download the OB3 VC — **member-only** (owner) for download

Performed by the **_Member user_** (only the claim owner can mint/download their credential).

- [ ] 1. Open **`/claims/<valid claim id>`** as the owner. Expected: the ACCEPTED claim shows
     share actions and a **"Download"** action (the `download` descriptor →
     `downloadUrl: /claims/<id>/download`, filename `<Achievement-Name>-credential.json`).
- [ ] 2. Trigger the download (or `POST /claims/<id>/download`). Expected: a **signed OB3
     VerifiableCredential** JSON is returned (`ensureClaimCredential` mints/caches and
     regenerates if stale). Inspect the JSON and confirm:
     - [ ] `proof.type` = **`DataIntegrityProof`**
     - [ ] `proof.cryptosuite` = **`eddsa-rdfc-2022`**
     - [ ] `proof.proofPurpose` = **`assertionMethod`**
     - [ ] `proof.verificationMethod` = **`did:web:<org domain>#key-0-multikey`**
     - [ ] `proof.proofValue` is a base58btc multibase string (starts with `z`)
     - [ ] `@context` = exactly the **two** OB3/VC URLs:
           `https://www.w3.org/ns/credentials/v2` and
           `https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json`
     - [ ] `type` = `['VerifiableCredential', 'OpenBadgeCredential']`

> ⚠️ Note — the exact `@context` URLs. The phase spec described `@context` as "the two OB3
> URLs"; the **actual** signed values are `…/ns/credentials/v2` +
> `…/ob/v3p0/context-3.0.3.json` (see `credentialTemplate.ts`). The legacy
> `…/suites/ed25519-2020/v1` context is **not** injected into new credentials (the
> DataIntegrityProof suite adds nothing on top of the VC 2.0 context). The
> `https://www.w3.org/2018/credentials/*` URLs you may see belong only to the **CHAPI wallet
> wrapper** in part D, not the signed VC.

## B. The DID document — **public**

- [ ] 3. Open **`/.well-known/did.json`** (any visitor). Expected: a JSON DID document with
     `id` = `did:web:<org domain>`, and for the org's signing key **both** verification
     methods are present:
     - [ ] `#key-0` of type **`Ed25519VerificationKey2020`** (verifies outstanding legacy
           `Ed25519Signature2020` credentials)
     - [ ] `#key-0-multikey` of type **`Multikey`** (the creator for new
           DataIntegrityProof credentials)
- [ ] 4. Confirm **`assertionMethod`** lists **both** `did:web:<domain>#key-0` **and**
     `did:web:<domain>#key-0-multikey`, and the document `@context` includes the DID v1,
     ed25519-2020/v1, and multikey/v1 contexts. Confirm `verificationMethod[].controller`
     is the org DID and both methods publish the **same** `publicKeyMultibase` (same key
     material, dual format).
- [ ] 5. Cross-check: the `verificationMethod` from the part-A credential
     (`#key-0-multikey`) **resolves** to a method published here.

## C. OB2 hosted assertion — **public** (PUBLIC + accepted claims only)

- [ ] 6. Open **`/ob2/a/<claim id>`** with a non-HTML `Accept` (e.g. `curl -H "Accept:
application/json"`). Expected: an **OB2 BadgeClass assertion** JSON
     (`badgeAssertionFromAchievementClaim`) is returned **only** when the claim is ACCEPTED,
     has `validFrom`, **`visibility === 'PUBLIC'`**, is **not suspended** (claim or
     achievement), and belongs to the current org; otherwise **404** (404 not 403, to avoid
     confirming a non-public claim exists).
- [ ] 7. Open **`/ob2/a/<claim id>`** in a **browser** (HTML `Accept`). Expected: a
     **redirect** — to **`/claims/<id>`** if you are logged in, else to
     **`/claims/<id>/public`** (content negotiation). The public claim page renders the
     badge, validity, and evidence for an ACCEPTED + PUBLIC claim.
- [ ] 8. (Parallel) The **`/c/<claim id>`** route behaves the same way: HTML →
     `/claims/<id>/public`; non-HTML → the OB2 assertion JSON under the same
     PUBLIC/accepted/not-suspended/same-org gate. (Per the source `TODO`, `/c/` returns the
     **OB2** JSON today — the OB3 JSON variant is not yet served there.)

## D. Backpack / CHAPI wallet — **member-only**; **manual / dev-limited**

Performed by the **_Member user_**.

- [ ] 9. Open **`/backpack`**. Expected: your claimed badges list (ACCEPTED + valid claims),
     any outstanding **invites** as alerts, plus per-claim **Share** (the share modal copies
     the `…/ob2/a/<id>` URL and offers a LinkedIn "Add to Profile" link). The backpack uses
     the **OB2** hosted URL for sharing.
- [ ] 10. **Send to wallet (CHAPI).** On the owner's **`/claims/<id>`** (when wallet
      **exchange is not** enabled), the **"Send to wallet"** action opens a modal that uses
      the **Credential Handler API (CHAPI)** polyfill: it `POST`s `/claims/<id>/download`,
      wraps the VC in a `VerifiablePresentation`, and calls `navigator.credentials.store(...)`
      to hand off to a registered wallet (e.g. LearnCard).
- [ ] 11. **Exchange path (if configured).** If the org is configured for **wallet exchange**,
      the action is instead **"Send to wallet"** via `SendToWalletExchangeModal`
      (`/claims/<id>/exchange`); `/claims/<id>/download` then returns **409** directing
      callers to the exchange endpoint.

> ⚠️ Dev caveats — CHAPI. CHAPI requires a **registered credential handler / wallet** in the
> browser and the polyfill from `chapi.io`; without a wallet registered to the same origin,
> `navigator.credentials.store(...)` has nowhere to deliver and the flow cannot complete
> end-to-end locally. The **download** (part A) and **OB2/OB3 emitter** (parts B–C) paths are
> fully exercisable in dev; the **wallet hand-off is effectively manual-only**.

## E. Suspension interaction — forward-reference to journey 9

Issuance is blocked for suspended content (note here, **exercise in**
[09 — Reporting & moderation](./09-reporting-moderation.md)):

- A suspended **claim** or its underlying **achievement** makes `/claims/<id>/download`
  return **403** (even for the owner), and the public **`/ob2/a/<id>`** and **`/c/<id>`**
  emitters return **404**. New claims against a suspended achievement are also blocked at
  claim time. Do not suspend anything now — journey 9 sets up the superadmin/moderation state
  and verifies these blocks.

## State produced

None new — this journey **validates issuance** for an existing valid claim.

## e2e candidate

- **OB3 proof shape** — **unit-covered**:
  `tests/vitest/lib/credentials/achievementCredentials.spec.ts` asserts
  `proof.type`, `cryptosuite`, `verificationMethod = …#key-0-multikey`, `proofPurpose`, and
  the two-URL `@context`. No new e2e needed just for the proof shape.
- **Public OB2/OB3 emitter + did.json** — **P2** (mostly stable HTTP surfaces). A new e2e
  could assert the `/ob2/a/<id>` JSON for a PUBLIC claim, the HTML→`/public` redirect, and the
  dual-method `did.json`. Beyond the standard seed it needs a **PUBLIC, valid claim**
  fixture; otherwise self-contained.
- **Backpack / CHAPI wallet** — **manual-only**. The CHAPI hand-off depends on a
  browser-registered wallet and is hard to automate reliably; keep it as a manual check.

## Citations

- Routes: [`src/routes/claims/[claimId]/download/+server.ts`](../../src/routes/claims/%5BclaimId%5D/download/+server.ts),
  [`src/routes/c/[claimId]/+server.ts`](../../src/routes/c/%5BclaimId%5D/+server.ts),
  [`src/routes/ob2/a/[claimId]/+server.ts`](../../src/routes/ob2/a/%5BclaimId%5D/+server.ts),
  [`src/routes/.well-known/did.json/+server.ts`](../../src/routes/.well-known/did.json/+server.ts),
  [`src/routes/credentials/[id]/+page.svelte`](../../src/routes/credentials/%5Bid%5D/+page.svelte),
  [`src/routes/backpack/+page.svelte`](../../src/routes/backpack/+page.svelte);
  the download/CHAPI affordances live in
  [`src/lib/partials/achievementClaim/ClaimDetail.svelte`](../../src/lib/partials/achievementClaim/ClaimDetail.svelte);
  the proof/context shape in
  [`src/lib/credentials/credentialTemplate.ts`](../../src/lib/credentials/credentialTemplate.ts)
  and [`src/lib/credentials/did.ts`](../../src/lib/credentials/did.ts).
- ADR: [`../adr/2026-06-12-data-integrity-proof-eddsa-rdfc-2022.md`](../adr/2026-06-12-data-integrity-proof-eddsa-rdfc-2022.md)
  (DataIntegrityProof / eddsa-rdfc-2022, the two-URL context, dual DID methods).
