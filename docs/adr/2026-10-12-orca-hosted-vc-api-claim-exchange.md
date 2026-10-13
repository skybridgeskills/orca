# ORCA hosts a VC-API claim exchange with DID-auth subject binding

- Status: Accepted
- Date: 2026-10-12
- Deciders: ORCA maintainers

## Context

**Send to wallet broke against LearnCard.** ORCA's CHAPI "Send to wallet" stored an
unsigned presentation wrapping a credential that ORCA had already signed. It loaded
`credential-handler-polyfill@3.0.1` from unpkg. In that version `WebCredential.options` has
no `protocols`, and LearnCard's handler runs `"vcapi" in credential.options.protocols`, which
threw `Cannot use 'in' operator to search for 'vcapi' in undefined`.

**LCW Sandbox can't receive a CHAPI store at all.** `lcw-sandbox.org` (the lcw-front-end
repo) registers only a CHAPI `get` handler. A `store()` reaches no listener, and the
polyfill reports `No "credentialrequest" event handler found`.

**The subject wasn't the wallet's DID.** The credential's `credentialSubject.id` was a
server-generated `did:web:<org>:u:<user>`, not a DID the holder controls. Orgs that use the
DCC transaction service already get the wallet's DID-authenticated holder DID as the subject,
because the service runs a VC-API claim exchange. Locally signing orgs had no equivalent.

**How the wallets start an exchange.** Both web wallets run the same VC-API exchange:

1. POST `{}`.
2. Receive a DIDAuthentication request with `challenge` and `domain`.
3. POST a signed presentation.
4. Receive `{ verifiablePresentation: { verifiableCredential: [vc] } }`.

They start it from different CHAPI calls:

- LearnCard starts it from `store()` when the data carries `interact.service` or the options
  carry `protocols.vcapi`.
- LCW Sandbox starts it only from `get()`.

## Decision

1. **ORCA always has a VC-API exchange URL for Send to wallet.**
   - Transaction-service orgs use the `vcapi` URL the service returns.
   - Locally signing orgs get an exchange hosted by ORCA on the org's own domain. It uses
     the transaction service's wire format and VCALM paths:
     - `POST /workflows/claim/exchanges/[id]`: participate.
     - `POST /workflows/claim/exchanges/[id]/bare-vp`: the LCW mobile doorway, which
       takes a bare VP in and returns a bare VP.
     - `GET /interactions/[id]?iuv=1`: the protocols object; browsers are redirected to the
       claim page.
   - `POST /claims/[id]/exchange` creates the exchange for either mode and returns the same
     shape: `{ exchangeId, protocols, expiresAt }`.
2. **Exchange URLs are capability URLs.**
   - No session is read. CORS allows any origin.
   - Lookup is scoped to the request's org.
   - Single use: the exchange is claimed atomically before signing and released in one
     write if signing fails.
   - The TTL is 15 minutes. A failed exchange is terminal; the UI starts a new one.
3. **DID authentication:**
   - did:key holders only.
   - Ed25519Signature2020 or DataIntegrityProof / eddsa-rdfc-2022.
   - The holder is the proof signer, and a mismatched top-level `holder` is rejected.
   - `domain` is the org origin.
   - Verification uses jsonld-signatures directly with a separate document loader, so
     embedded credentials are never verified and the signing path never resolves holder
     DIDs.
4. **Data model:**
   - **`AchievementCredential` is the issuance record.** It gains `claimId` (relation
     `IssuedCredentials`, `ON DELETE CASCADE`).
   - **Cached and holder-bound credentials are separate rows.** The claim's `credentialId`
     (relation `CachedCredential`) still points at the cached did:web-subject credential
     used by download and the OB3 API. Each completed exchange adds a holder-bound
     credential: subject = holder DID, a fresh `urn:uuid` id, and `claimId` set.
   - **`CredentialExchange` holds protocol state only** and can be deleted at any time.
     State is derived from `startedAt`, `completedAt` and `errors`
     (`pending | active | complete | invalid`). The daily cron
     (`/api/cron/purge-messages`) deletes rows that expired more than 24 hours ago.
5. **CHAPI client:**
   - `store()` with a credential-less VP that carries `interact.service`
     (`VerifiableCredentialApiExchangeService`), plus `options.protocols.vcapi`. No fallback
     VC.
   - The polyfill is `credential-handler-polyfill@4.1.0`, bundled and loaded with
     `load({ setGlobal: false, mediatorOrigin })` and memoized in `$lib/chapi`. Nothing
     patches `navigator.credentials`.
6. **One Send to wallet modal for both modes:**
   - CHAPI button, QR code and deep link.
   - The owner-only `GET /claims/[id]/exchange/[exchangeId]` status endpoint, checked every
     6 s while the modal is open. For transaction-service orgs it reads the service's
     exchange state.

## Alternatives considered

- **Keep storing a pre-signed VP through CHAPI** after upgrading the polyfill. This fixes the
  LearnCard crash, but the subject stays a server-generated DID the holder doesn't control.
- **CHAPI `get()` with a VPR that carries `interact`.** This reaches LCW Sandbox, but sends
  LearnCard to its "share credentials you hold" picker, which breaks the main web wallet.
- **Two CHAPI buttons** (`store` and `get`). Rejected for the UX cost. LCW Sandbox should add a
  store handler instead.
- **A fallback VC in the CHAPI `data`** for wallets that don't understand exchanges. The only
  such wallet found is Digital Bazaar's CHAPI Demo Wallet, a developer tool, so it isn't
  worth a second signing per click.
- **Keep exchange state, or the holder-bound credential link, on the claim or the exchange
  row.** Purging exchanges would orphan the issuance record, and the claim's unique
  `credentialId` can only point at one credential.
- **Require the transaction service for DID binding.** This leaves locally signing orgs,
  most orgs today, without a holder-bound subject.
- **`chapi.interact({ interactionUrl })`** from polyfill 4.x. Neither wallet reads
  `protocols.interact` yet.

## Consequences

- **A claim can have many credentials:** one cached did:web credential plus one per
  completed exchange. Code that needs "the" credential for a claim keeps using
  `claim.credentialId`.
- **ORCA has a new unauthenticated, cross-origin surface.** These routes:
  - cap the body at 64 KB;
  - send `no-store`;
  - return CORS headers on every response, including unexpected 500s;
  - write only sanitized error codes and messages to `errors`.
- **LCW Sandbox still can't receive credentials from ORCA over CHAPI** until it adds a
  `store` handler. LCW mobile is offered the `lcw` deep link to the `/bare-vp` doorway;
  that path is unproven on a real device.
- **Transaction-service status isn't tied to the claim.** ORCA doesn't record
  transaction-service exchange ids, so its status endpoint can't confirm an id belongs to
  the claim. It returns only state and expiry, and only to a signed-in owner of a claim in
  the org.
- **The migration is additive:** a new table, a nullable column and a backfill. Under ADR
  2026-10-09 there is no outage window.
- **Manual wallet testing needs a deployed preview.** Chrome blocks public origins such as
  learncard.app from fetching `http://localhost`.
