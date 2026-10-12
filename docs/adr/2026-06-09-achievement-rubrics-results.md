# Achievement rubrics & review results

- Status: Accepted
- Date: 2026-06-09 (implemented 2026-06-11)
- Deciders: ORCA maintainers

## Context

Reviewers could endorse a claim with a free-text narrative + evidence URL, but there
was no structured way to express **what** they assessed or **how** they rated it.
OpenBadges 3.0 models this with `ResultDescription` (B.1.17 — a criterion with allowed
values) and `Result` (B.1.16 — a chosen value). We want achievement editors to define
a lightweight rubric and reviewers to rate against it, without building the full OB3
result machinery (criterion-level ladders, required levels, numeric ranges).

This builds on the flattened `Achievement` model (ADR
`2026-06-09-achievement-config-merge`) and the additive steward overlay (ADR
`2026-06-09-steward-review-and-messaging`).

## Decision

1. **Latest-only rubric on `Achievement.json.resultDescriptions`.** An achievement
   carries only its **current** rubric (an array of `ResultDescription`s, each a
   `name` + ordered `allowedValue[]` + stable `urn:uuid` id). No history, no retired
   list, no version model — the JSON holds the present rubric.

2. **Re-mint id on content change.** When an editor saves, each submitted row is
   matched to the existing rubric by id; if its content (name / order-sensitive
   allowedValue / resultType / requiredValue) is unchanged the id is kept, otherwise a
   fresh `urn:uuid` is minted. Removed rows drop out. This makes "did this criterion's
   meaning change?" a pure id comparison.

3. **Self-describing `Result`s on the endorsement.** When a reviewer endorses, their
   per-criterion picks are stored in `ClaimEndorsement.json.results` as
   `{ type:['Result'], resultDescription: <rdId>, value, name }` — the criterion
   `name` is **snapshotted**, so a result still renders even if its RD was later
   changed or removed.

4. **Current/stale by set membership.** A review is **current** iff every result's
   `resultDescription` id is in the achievement's current rubric set; otherwise it is
   **stale** and rendered with its snapshotted values plus a "Not current" tag. A
   review with no results (narrative-only) is always current.

5. **Default Pass/Fail sentinel.** When no rubric is configured, reviewers rate
   against a shared default `ResultDescription` with a fixed sentinel id
   (`urn:uuid:00000000-0000-4000-8000-000000000001`, `allowedValue:['Fail','Pass']`).
   Default-sentinel reviews are current until a real rubric is added, then go stale.

6. **New-validity counts current reviews only; `validFrom` stays sticky.** When
   determining whether a not-yet-valid claim becomes valid, only **current** reviews
   count toward the threshold (the self-claim flow filters endorsements by
   `reviewIsCurrent`; the steward short-circuit is likewise gated). An already-valid
   claim keeps its `validFrom` — staleness never revokes validity. Achievements with
   no rubric behave exactly as before (the no-op case).

## Consequences

- All rubric logic is a pure, framework-free module (`resultDescription.ts`),
  trivially unit-tested; the servers and components consume it.
- A rubric edit that changes a criterion silently invalidates prior reviews _for
  threshold purposes on not-yet-valid claims_ — visible via the "Not current" tag —
  without touching already-granted badges.
- Results are stored on each endorsement (self-describing), so rendering never needs
  to resolve a retired RD; the trade-off is some duplication of the criterion name.
- The endorsements endpoint computes `current` server-side (per claim's achievement
  json), so the client never receives the full rubric just to tag reviews.

## Out of scope (recorded)

- Gating validity on `requiredValue` (validity stays review-count based).
- Emitting `Result` / `ResultDescription` into issued OB3 credentials or OB2
  assertions.
- `rubricCriterionLevel` ladders, `requiredLevel`, numeric/range result types, RD
  alignments, and per-RD reviewer assignment.
- A `latestReview` claim-cache (the endorsement list + "Not current" tag made it
  unnecessary).
