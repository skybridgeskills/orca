# 03 — Edit & regressions

**Actor:** _Admin_ · **admin-only** · **Consumes:** the authored badges from
[`02-achievement-authoring.md`](./02-achievement-authoring.md) · **Produces:** nothing new
(validates the existing matrix).

Edit-form regressions on **`/achievements/[id]/edit`**. These guard real bugs from the
config-merge work — verify nothing is clobbered when an admin edits a badge. Setup is in
[`00-setup.md`](./00-setup.md); conventions in the [README](./README.md). The edit form is
the same `AchievementForm` used by create, hydrated from the saved badge.

## Preconditions

- [ ] Logged in as **_Admin_**.
- [ ] The journey-02 matrix exists: _Member_, _Prereq_, _Gated_, _Reviewed_, _Invite-only_,
      _Competency_, and the _Core_ category. **Do not reset** between journeys.
- [ ] For the image test, one badge has an **uploaded image**. If none of the journey-02
      badges got an image, first edit **_Member_** at `/achievements/[id]/edit`, upload a PNG,
      Submit — then use _Member_ for step 1.

## Steps

### 1. Image preserved on a text-only edit

1. - [ ] Open the badge **with an uploaded image** at **`/achievements/[id]/edit`**. Confirm
         the existing image shows in the logo/image drop zone.
2. - [ ] Change **only text** (e.g. tweak the **Description**). Do **not** touch the image.
         Click **Submit** → redirects to `/achievements/[id]`.
3. - [ ] Expected: the **image is unchanged** (still rendered on the detail page). Regression
         guard — a text-only edit must not null out `image`. (The form only marks the image
         edited when a new data-URI is dropped or the image is cleared.)

### 2. `achievementType` preserved when editing a _Competency_

4. - [ ] Open **_Competency_** at **`/achievements/[id]/edit`**. The edit form does **not**
         expose an `achievementType` field.
5. - [ ] Change **only text** (e.g. the **Description**) and **Submit**.
6. - [ ] Expected: on the _Competency_ detail page the **book-check icon stays** — the
         `Competency` `achievementType` is **preserved, not wiped to null**. Regression guard:
         the edit action only writes `achievementType` when the request actually carries it, so
         a plain edit leaves it intact (otherwise the icon would revert to the no-image
         Ribbon fallback). Cite ADR
         [`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md).

### 3. No-category edit doesn't FK-error

7. - [ ] Open **_Competency_** (it's **Uncategorized** — see journey 02) at
         `/achievements/[id]/edit`. The **Category** select shows **"- Uncategorized -"**.
8. - [ ] Leave it Uncategorized, change a little text, **Submit**.
9. - [ ] Expected: saves cleanly with **no foreign-key error** — a missing/"uncategorized"
         category is treated as _no category_ (the action does `category: { disconnect: true }`
         rather than connecting an empty id).
10. - [ ] (Category change) Open **_Prereq_** (filed under _Core_), change its **Category** to
          **"- Uncategorized -"**, Submit; then edit again and set it **back to _Core_**, Submit.
          Expected: both directions save without error and the detail page reflects the change.

### 4. Claim / review / rubric round-trip

11. - [ ] Open **_Gated_** at `/achievements/[id]/edit`. Confirm the **claim** config
          round-trips: claimable on, "requires another badge" = **_Prereq_** preselected. Save
          without changes → still gated by _Prereq_ (claimRequires not clobbered).
12. - [ ] Open **_Reviewed_**. Confirm the **review** config round-trips: reviewer rule =
          **"This badge"** (self) preselected (the picker re-presents the self-reference as
          "This badge"), **reviewsRequired** = your journey-02 value, and the **_Admin_** steward
          checkbox is **checked**. Save without changes → all preserved.
13. - [ ] **Rubric re-mint:** on **_Reviewed_**, open the **Rubric** pane and **edit a result
          row** (change a name or an allowed value), then Submit. Expected: that row's **id is
          re-minted** (changed) because its content changed. Cite ADR
          [`../adr/2026-06-09-achievement-rubrics-results.md`](../adr/2026-06-09-achievement-rubrics-results.md).
14. - [ ] **Rubric stable:** edit _Reviewed_ again and Submit with the rubric **unchanged**.
          Expected: the result-row **ids stay stable** (no re-mint when content is identical).
15. - [ ] (Alignment, optional) Add an **Alignment** row (target name + URL) to any badge,
          Submit, re-open: the alignment round-trips in `json.alignment` and pre-existing json
          keys (reviewsRequired, stewards, rubric) are **not** dropped.

## State produced

- **None new.** This journey validates the existing badges; the matrix from journey 02 is
  unchanged except for any intentional text/image tweaks above. (If you re-minted a _Reviewed_
  rubric id in step 13, that's fine — later journeys don't depend on the specific id.)

## e2e candidate

- **image-preserved** (step 1) and **achievementType-preserved** (step 2) — yes, **P0**: both
  were real regressions; an automated guard is high value. Seam note: needs a fixture with an
  image-bearing badge and a Competency badge — the existing
  `tests/playwright/globals/setup.ts` seed (one plain claimable achievement) must be extended.
- **rubric re-mint vs stable** (steps 13–14) — yes, **P1** (spike feature). Seam note: needs a
  rubric-bearing badge fixture.
- **no-category / category-change** (steps 7–10) — P1 regression guard; folds into the same
  edit fixture.

## Citations

- Route: [`/achievements/[id]/edit`](../../src/routes/achievements/%5Bid%5D/edit).
- ADRs: [`../adr/2026-06-09-achievement-config-merge.md`](../adr/2026-06-09-achievement-config-merge.md),
  [`../adr/2026-06-09-achievement-rubrics-results.md`](../adr/2026-06-09-achievement-rubrics-results.md).

Next: [`04-claiming.md`](./04-claiming.md).
