# Skill library service abstraction (static now, remote later)

- Status: Accepted
- Date: 2026-06-11
- Deciders: ORCA maintainers

## Context

To accelerate community onboarding and showcase ORCA, an admin can stand up a set
of "durable skills" (soft/transferable competencies) as achievements from a curated
library — a whole-page picker at `/achievements/add-skills`. Each skill becomes an
OB3 `Competency`-type achievement seeded with a name, description, and a terse
`ResultDescription` rubric of proficiency levels (no image; a `book-check` icon
renders in the image slot).

The initial library is a fixed set of 20 skills. But the longer-term intent is that
an organization could point ORCA at a **remote, org-configured skills library**
(an HTTP service) and pick from that instead. We need the call sites that consume
skills to be insulated from where the skills come from.

## Decision

1. **Define a `SkillLibrary` interface with async methods** (`list()`, `search()`)
   in `src/lib/skills/library.ts`. Methods are promise-returning even though today's
   implementation is synchronous data, so a future HTTP implementation is a
   drop-in with no call-site changes.

2. **Ship a static implementation now** (`staticLibrary.ts`) backed by 20 hardcoded
   `DurableSkill` definitions (`durableSkills.ts`). It resolves copies of the data
   so callers cannot mutate the library.

3. **Select the implementation through a `getSkillLibrary()` factory**, not a direct
   import of the static impl. Call sites depend only on the interface + factory; the
   factory is the single seam where a future branch on org/env config returns an
   HTTP-backed impl.

4. **Seed a single `ResultDescription` per skill** via `buildSkillResultDescription`,
   which reuses the rubrics module (`mintResultDescriptionId`, `RESULT_TYPE_DEFAULT`,
   the ambient `App.ResultDescription` type). The skill library does not define its
   own rubric/result model.

5. **Create achievements one-by-one through the existing create action**
   (`/achievements/create`). The picker POSTs each selected skill (reusing the
   action's field contract, including the rubric wire format) rather than introducing
   a bulk-create endpoint. No create logic is duplicated.

## Consequences

- New skill sources (e.g. a remote HTTP library) can be added behind
  `getSkillLibrary()` without touching the picker page or the create flow.
- The 20-skill set lives in code (versioned, reviewable) and is treated as seed/
  reference data: its English text is stored verbatim on the created achievement
  rows and is intentionally **not** routed through paraglide i18n (only the picker's
  UI chrome is localized).
- One-by-one creation keeps the picker resilient (a single failure doesn't lose the
  other successes) but means N HTTP round-trips for N skills. Acceptable for an
  onboarding action over a small curated set; a bulk endpoint can be added later if
  needed.
- `achievementType` is persisted to the existing `Achievement.achievementType`
  column (not JSON); seeded rubrics live in `Achievement.json.resultDescriptions`,
  reusing the rubrics data model.

## Alternatives considered

- **Hardcode the skills directly in the picker page.** Rejected: it couples the UI to
  the data shape and forecloses a remote library without a refactor.
- **Build the HTTP client implementation now.** Rejected as premature — there is no
  remote library to target yet; the interface + factory reserve the seam at no cost.
- **Add a bulk "create all selected" endpoint.** Rejected for the first iteration: it
  would duplicate the create action's validation/business rules. Out of scope; the
  interface and one-by-one flow do not preclude adding one later.
