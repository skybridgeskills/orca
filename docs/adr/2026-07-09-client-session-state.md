# Client session state: context-scoped store + `invalidateAll` refresh

- Status: Accepted
- Date: 2026-07-09
- Deciders: ORCA maintainers

## Context

The client tracked the signed-in user through two parallel channels that drifted
apart after a client-side (SPA) login:

1. A module-level Svelte store `$session` (in `sessionStore.ts`), written directly
   by the login handlers.
2. `data.session`, derived from `locals.session` in `hooks.server.ts` and exposed
   by `+layout.server.ts`.

Login updated the store and navigated with `goto()` but never called
`invalidateAll()`, so `data.session` stayed stale until a full page reload. Pages
that gated admin UI on `data.session` (e.g. the `/about` edit button) did not
recognize the user's role until a hard refresh, while `Nav` (reading the store)
already showed them as logged in. Session reads were spread across five different
patterns (`$session`, `data.session`, `$page.data.session`, a bespoke
`getContext('session')`, and server `locals.session`).

A module-level store cannot be safely populated during SSR: module state is shared
across all requests on the SvelteKit server, so seeding it server-side would leak
one user's session to another. That is why the store was client-only, which in turn
made auth-gated UI depend on `data.session` for correct server rendering — the
source of the split.

## Decision

1. **The client session is provided per request via Svelte context.** `+layout.svelte`
   seeds a context-scoped store from `data.session` (`setSessionContext`) and keeps
   it in sync with an `$effect`. Components read it through `getSession()`
   (`$lib/session/context.ts`). Because context is per request, this is SSR-correct
   (auth-gated UI renders right on the server, no flash) and cannot leak between
   requests.

2. **`locals.session` remains the authoritative security boundary.** Server
   `load`/action/endpoint guards continue to enforce access using the cookie-backed
   session. The client session is for presentation only.

3. **Auth state is refreshed with `invalidateAll()`, never by assigning a store.**
   Login handlers and post-mutation flows call `await invalidateAll()` so the server
   `load` re-runs and `data.session` (hence the context store) updates. Manual
   `$session = …` assignment is removed.

4. **No full page reloads in the login/claim path.** `invalidateAll()` refreshes
   data without reloading, so in-progress client state survives login — notably the
   pending claim in `activeClaimStore` during the accept-claim-invite flow, where an
   unauthenticated user authors a claim, signs in, and returns to auto-submit it. A
   `window.location.*` reload would wipe that state and is prohibited here (the prior
   `about/edit` reload hack was removed).

5. **The module-level `$session`/`sessionStatus` stores were removed.** Non-component
   modules (e.g. `backpackStore`) receive session data as arguments rather than
   importing a global store. `sessionStore.ts` retains only `nextPath` (a redirect
   target, not user-identifying).

## Consequences

- One consistent client read pattern (`getSession()`); no store↔page-data drift.
- SSR renders auth-gated UI correctly with no post-hydration flash and no
  cross-request leakage.
- New client code must read the session via `getSession()` and refresh auth state
  via `invalidateAll()`; it must not reintroduce a module-level session store or a
  reload-based post-auth navigation.
- Components consuming `getSession()` must be rendered within the layout's context
  provider (it throws otherwise), which is the case for all route components.

## Alternatives considered

- **Keep the module `$session` store as the single interface, mirror it from
  `data.session`.** Rejected: a module store can't be populated during SSR, so
  auth-gated UI would render logged-out on the server and flash in after hydration —
  a regression on the very controls this change fixes.
- **Standardize on `page.data.session` (`$app/state`) everywhere and drop the
  store.** SSR-correct, but leaves non-component modules without an accessor and
  discards a convenient reactive interface; context gives the same correctness with a
  single ergonomic `getSession()`.
