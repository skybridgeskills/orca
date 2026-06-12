# Claim visibility authorization model

- Status: Accepted
- Date: 2026-06-09
- Deciders: ORCA maintainers

## Context

Achievement claims carry a `visibility` value (`PUBLIC`, `COMMUNITY`,
`ACHIEVEMENT`, `PRIVATE`). Before this work, every claim read surface enforced
only org-scoping and claim status: any authenticated org member could read any
claim, and the public/OB2 endpoints served any `ACCEPTED` claim regardless of
its visibility.

The same authorization question — "may this viewer see this claim?" — is asked
in several distinct shapes:

- single, already-loaded claim (authenticated claim page, public page, OB2/`c`
  JSON endpoints);
- list queries that must be filtered in the database (member profile,
  `achievementClaims` API), where counts must match the filtered rows.

Implementing this rule inline at each surface would let the surfaces drift
(e.g. one endpoint treats `ACHIEVEMENT` differently from another), and would
make the admin-bypass and owner-precedence rules easy to get subtly wrong.

A few policy questions were settled before implementation:

- Admins bypass visibility (Q3).
- Public/unauthenticated endpoints return **404** (not 403) for non-`PUBLIC`
  claims (Q4).
- `PRIVATE` = owner + admins only (Q5).
- The `visibility` value is returned on rows the viewer is allowed to see (Q6).
- `ACHIEVEMENT` visibility is, for now, treated the same as `COMMUNITY`
  (deferred; D2).

## Decision

1. **Single source of truth.** All visibility logic lives in
   `src/lib/server/claimVisibility.ts` and is reused by every read surface. No
   surface re-implements or forks the rule. The module exports a viewer-role
   resolver (`viewerRole`), a single-claim predicate (`canViewClaim`), and a
   Prisma `where` fragment for lists (`claimVisibilityWhere`).
2. **Viewer-role model.** A viewer is resolved to one of `owner > admin >
community > public` relative to a claim, in that precedence order. "Admin"
   means `GENERAL_ADMIN` or `CONTENT_ADMIN` (matching `lib/permissions/isAdmin`);
   `BILLING_ADMIN` is treated as community. The owner of a claim always
   outranks their admin role.
3. **Admin bypass.** Admins see every claim regardless of visibility, on both
   single-claim and list surfaces (`canViewClaim` returns `true`;
   `claimVisibilityWhere` returns `{}`).
4. **404, not 403, on public surfaces.** The public page
   (`/claims/[id]/public`) and the OB2/`c` JSON endpoints serve only `PUBLIC`
   claims; anything else returns 404 using the surface's existing not-found
   message. A 404 avoids confirming that a non-public claim exists.
5. **`PRIVATE` = owner + admin.** Community viewers may see `PUBLIC`,
   `COMMUNITY`, and `ACHIEVEMENT` claims, never others' `PRIVATE` claims. In
   shared lists, the `where` fragment OR-includes the viewer's own claims so a
   member never loses sight of their own `PRIVATE` claims.
6. **Visibility is additive to org-scoping.** `claimVisibilityWhere` only adds
   the visibility dimension and is ANDed with each caller's existing filters
   (`organizationId`, `achievementId`, `claimStatus`, …). Org-scoping remains on
   every query. List counts use the same filter as the list so displayed totals
   match visible rows. `visibility` is a scalar column and is returned by
   Prisma's default select; no surface adds a `select` that strips it.
7. **`ACHIEVEMENT` deferred to `COMMUNITY`.** Until a distinct policy exists,
   `ACHIEVEMENT` is grouped with `COMMUNITY` in both the predicate and the
   `where` fragment. Changing this is a single-file change in the helper.

## Consequences

- Every claim read surface — `/claims/[id]`, `/claims/[id]/public`,
  `/ob2/a/[id]`, `/c/[id]`, the member profile list, and the
  `achievementClaims` API — enforces the same rule, and a future policy change
  is made in one place.
- Public callers cannot distinguish "claim does not exist" from "claim exists
  but is not public," by design.
- Because the list `where` fragment OR-includes the viewer's own `userId`, a
  member always sees their own claims (including `PRIVATE`) in shared lists,
  which is the intended behaviour but means list results are viewer-dependent.
- Any future surface that needs a visibility rule the helper does not express
  (e.g. an endpoint where "community" should behave differently) must extend the
  helper rather than fork the logic; doing otherwise contradicts this decision
  and requires a new ADR.
- When `ACHIEVEMENT` gains a distinct policy, the helper and this ADR must be
  revisited together.
