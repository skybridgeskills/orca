# 02 — Achievement authoring

**Actor:** _Admin_ · **admin-only** · **Consumes:** org configured (from
[`01-org-setup.md`](./01-org-setup.md)) · **Produces:** _Category_; badges _Member_,
_Prereq_, _Gated_, _Reviewed_, _Invite-only_, _Competency_; `membershipAchievement` set to
_Member_.

Author the **badge matrix** the earning journeys (04–05) reuse. Name the entities **exactly**
as below — later journeys reference them by name. Setup is in
[`00-setup.md`](./00-setup.md); the run convention is in the [README](./README.md).

The create form lives at `/achievements/create` and renders `AchievementForm`. The
claim/review/invite controls are inside a **collapsible "Earning and review" pane** (open it
to reach them); rubric and alignment are their own collapsible panes lower down.

## Preconditions

- [ ] Logged in as **_Admin_**; org configured per journey 01.
- [ ] `editAchievementCapability` = "Only administrators" (journey 01), so the _Admin_ can
      reach `/achievements/create`. (A non-permitted user is redirected to `/achievements`.)

## Steps

### A. Create a _Category_ (`/achievements/categories`)

1. - [ ] Go to **`/achievements/categories`**. The page is a table with an empty **final row**
         that is the "new category" form.
2. - [ ] In that final row, type a **name** (use **`Core`** for this run) and a **weight**
         (default placeholder `1000`), then click **Create**.
3. - [ ] Expected: the new **_Category_** ("Core") appears as a table row with an achievement
         count of `0`. (Inline **Edit**/**Delete** per row also work; not required here.)

### B. Badge matrix (`/achievements/create`)

For each badge: go to **`/achievements/create`**, fill **Name** + **Description**, set
**Category = Core** (the category select; default is "- Uncategorized -"), configure the
earning settings below, then **Submit**. Expected on success: redirect to
**`/achievements/[id]`** (the new badge's detail page).

#### B1. _Member_ — publicly claimable

4. - [ ] Name **`Member`**. Open **"Earning and review"**. Under **"Allow people to claim
         this achievement?"** choose **"Anyone can claim this"** (the public-claim radio).
         Leave review = "No review required" and invite = none.
5. - [ ] Submit. Expected: _Member_ detail page; the badge is claimable by anyone with no
         prerequisite.

#### B2. _Prereq_ — open claimable

6. - [ ] Name **`Prereq`**. **"Anyone can claim this"** (same as _Member_). Submit.

#### B3. _Gated_ — `claimRequires` = _Prereq_

7. - [ ] Name **`Gated`**. Under "Allow people to claim", choose the **"requires another
         badge"** option, click **Choose...**, and in the picker select **_Prereq_**.
8. - [ ] Submit. Expected: _Gated_ is claimable but **requires holding _Prereq_** first
         (`claimRequiresId` → _Prereq_). The picker excludes the badge being edited from its own
         options.

#### B4. _Reviewed_ — `reviewsRequired ≥ 1`, reviewer rule, stewards, rubric

The reviewer rule has three shapes; this single _Reviewed_ badge uses the **"This badge"**
self-reference variant (the spike feature) plus stewards and a rubric. The other two
variants — **reviewed-by-admin** and **reviewed-by-holders-of-another-badge** — are noted so
a tester can spot-check them.

9.  - [ ] Name **`Reviewed`**. **"Anyone can claim this"** so it can be claimed and then
          reviewed.
10. - [ ] Under **"How are claims reviewed?"** choose the **"holders of a specific badge"**
          radio, click **Choose...**, and in the picker select **"This badge"** (the self
          option — the picker offers `allowSelf`). This means holders of _Reviewed_ itself
          review new _Reviewed_ claims. Cite ADR
          [`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md)
          (self-relation / "this badge" requirement).
11. - [ ] Set **"How many reviews are required?"** to **`1`** (or more). Expected: the field is
          enabled only when the badge-reviewer option is selected.
12. - [ ] **Stewards**: with a review rule selected, a **steward checklist** of org members
          appears. Check the **_Admin_** as a steward. A steward can approve a claim directly,
          alongside the review requirement. Cite ADR
          [`../adr/2026-06-09-steward-review-and-messaging.md`](../adr/2026-06-09-steward-review-and-messaging.md).
13. - [ ] Open the **"Rubric"** collapsible pane. Click **"+ Add a result"** to add a
          **result description**: give it a **name** (e.g. `Overall`) and ≥2 **allowed values**
          (e.g. `Pass`, `Fail`). Cite ADR
          [`../adr/2026-06-09-achievement-rubrics-results.md`](../adr/2026-06-09-achievement-rubrics-results.md).
14. - [ ] Submit. Expected: _Reviewed_ detail page; `reviewsRequired = 1`,
          `reviewRequiresId` = _Reviewed_'s own id (self), stewards include _Admin_, and the
          rubric is persisted (each result row got a minted id).
15. - [ ] (Optional spot-checks, do NOT keep — they change the matrix) On a throwaway badge or
          by re-reading the form, confirm the other two reviewer shapes exist: **"by an
          administrator"** (forces reviewsRequired = 1) and **"holders of a specific badge"**
          pointing at a _different_ badge (e.g. _Prereq_). The named _Reviewed_ entity stays on
          the **This badge** variant.

#### B5. _Invite-only_ — `capabilities.inviteRequires`

16. - [ ] Name **`Invite-only`**. Leave claim = "No one can claim this" (it's awarded by
          invitation, not self-claim). Under **"Who can invite people to earn this badge?"**
          choose the **"holders of a specific badge"** option, click **Choose...**, and select a
          badge — use **"This badge"** (self) or another badge such as _Member_; for this run
          pick **_Member_** so members can invite.
17. - [ ] Submit. Expected: _Invite-only_ detail page with `json.capabilities.inviteRequires`
          set (only awardable by invitation; consumed in journey 05).

#### B6. _Competency_ — via `/achievements/add-skills`

18. - [ ] Go to **`/achievements/add-skills`**. Expected: a searchable grid of curated
          **durable skills**, each card showing a **book-check style icon** (the `Competency`
          `AchievementIcon`), the skill statement, and level chips. Cite ADR
          [`../adr/2026-06-11-skill-library-service.md`](../adr/2026-06-11-skill-library-service.md).
19. - [ ] Confirm the page is **admin-gated**: a non-permitted user is redirected to
          `/achievements` (same `canEditAchievements` gate as create).
20. - [ ] Pick one skill and click **"Add"**. Expected: the button shows a loading state then
          **"Done"** and becomes **disabled**. This creates a **`Competency`-type** achievement
          (no uploaded image — it uses the book-check icon) with a **seeded rubric** (one result
          description whose allowed values are the skill's levels), `claimable = off`.
21. - [ ] Confirm an **already-added** skill (its label already matches an existing achievement
          name) shows as **"Done" / disabled** on load — prevents duplicate competencies.
22. - [ ] Treat the skill you added as **_Competency_** for the rest of the guide. Open its
          detail page from `/achievements` and confirm the **book-check icon** renders (not an
          uploaded image).

> ⚠️ note: `/achievements/add-skills` creates the competency by POSTing to the
> `/achievements/create` action with `achievementType=Competency` and no category — so
> _Competency_ is **Uncategorized**, not filed under _Core_. The create action treats an
> empty/missing category as `uncategorized` (no FK error). This is expected; just don't expect
> _Competency_ under the _Core_ category.

### C. Set `membershipAchievement` = _Member_ (`/about/edit`)

Per the P1 review decision, the org's membership badge is set **here**, at the end of
authoring, now that _Member_ exists. Cite ADR
[`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md).

23. - [ ] Go back to **`/about/edit`** → **Membership** section ("How is membership
          determined"). Choose the **"holders of a specific achievement"** option, click
          **Choose...**, and select **_Member_**.
24. - [ ] Click **Submit** (reloads to `/about`). Expected:
          `org.json.permissions.membershipAchievement.requiresAchievement` = _Member_'s id.
25. - [ ] Re-open `/about/edit` and confirm the Membership section shows the badge option
          selected with _Member_ chosen (round-trips). This gating is exercised in
          [`07-membership-visibility.md`](./07-membership-visibility.md).

## State produced

- **_Category_** "Core".
- Badges **_Member_** (public claim), **_Prereq_** (public claim), **_Gated_**
  (claimRequires = _Prereq_), **_Reviewed_** (reviewsRequired ≥ 1, reviewRequires = self
  "This badge", _Admin_ steward, rubric), **_Invite-only_** (inviteRequires set),
  **_Competency_** (Competency type, seeded rubric, Uncategorized).
- **`membershipAchievement` = _Member_**.

## e2e candidate

- **create + open public claim** — already covered by `critical/admin-create-achievement`;
  don't duplicate.
- **add-skills** (competency creation + already-added disable) — yes, **P1** (spike feature).
  Seam note: needs a new fixture; the existing seed has no skill-library assertions.
- **rubric config**, **steward assignment**, **"This badge" self-review**, **`claimRequires`
  config** — yes, **P1** each (spike features authored here, consumed in 04/05). Seam note:
  these extend the create/edit flow; fit a new authoring fixture rather than the minimal
  `tests/playwright/globals/setup.ts` seed.

## Citations

- Routes: [`/achievements/categories`](../../src/routes/achievements/categories),
  [`/achievements/create`](../../src/routes/achievements/create),
  [`/achievements/add-skills`](../../src/routes/achievements/add-skills),
  [`/about/edit`](../../src/routes/about/edit).
- ADRs: [`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md),
  [`../adr/2026-06-09-steward-review-and-messaging.md`](../adr/2026-06-09-steward-review-and-messaging.md),
  [`../adr/2026-06-09-achievement-rubrics-results.md`](../adr/2026-06-09-achievement-rubrics-results.md),
  [`../adr/2026-06-11-skill-library-service.md`](../adr/2026-06-11-skill-library-service.md),
  [`../adr/2026-06-12-membership-achievement-gating.md`](../adr/2026-06-12-membership-achievement-gating.md).

Next: [`03-edit-and-regressions.md`](./03-edit-and-regressions.md).
