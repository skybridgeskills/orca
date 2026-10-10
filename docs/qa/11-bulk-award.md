# 11 — Bulk award

An admin awards one badge to many people at once from a CSV. Each row goes through
the same award API as the single award in journey 5, one request at a time: an
existing member gets the badge (a claim), a new email gets an invite, and a bad
row fails on its own without stopping the rest. Re-running the same CSV must not
email anyone twice. Also covers the invite detail page and deleting an invite.

Do the [setup](./00-setup.md) first; run after [10 — OAuth & API](./10-oauth-and-api.md).
**Do not reset the database.**

## Preconditions

- The org from journey 1 and the **_Admin_** account.
- The **_Invite-only_** badge from journey 2.
- The **_Member user_** from journey 4 (a verified member who does **not** hold
  _Invite-only_), and the **_Invitee user_** from journey 5 (who already holds
  _Invite-only_ through the _Admin_'s invite).
- A fresh email address nobody has used yet: the **_Bulk invitee_**.
- Emails print to the dev-server console (see setup). Keep it visible: the
  duplicate-email checks below read it.
- Optional: `PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS` in `.env` (default 500 ms between
  rows). A larger value such as `3000` makes the progress easier to watch; restart
  the dev server after changing it.

Prepare **`bulk.csv`** (the header row must have all three columns; the values may
be empty):

```csv
email,narrative,evidenceUrl
<Member user email>,Led the spring cleanup,https://example.com/cleanup
<Bulk invitee email>,,
<Invitee user email>,Second award attempt,
not-an-email,,
```

## A. Upload and preview — **admin-only** (or invite-capability holder)

- [ ] 1. As _Admin_, open **`/achievements/<Invite-only id>/award`**. Expected: an
     **"Award in bulk"** link under the page description → it opens
     **`/achievements/<Invite-only id>/award/bulk`** ("Bulk Award", with the badge
     summary).
- [ ] 2. Click **"Download example CSV"**. Expected: `bulk-award-example.csv`
     downloads with the header `email,narrative,evidenceUrl` and one sample row.
- [ ] 3. Upload a CSV **missing a column** (e.g. only `email`). Expected: an error
     "CSV is missing required columns: narrative, evidenceUrl"; nothing is sent.
- [ ] 4. Upload a CSV with a row whose **email is empty**. Expected: the whole file
     is refused with an error naming the number of rows without an email.
- [ ] 5. Upload **`bulk.csv`** (click the drop zone, or drag the file onto it).
     Expected: a preview table with the 4 rows (email, narrative, evidence URL) and
     "4 rows ready to process".
- [ ] 6. Click **"Back"**. Expected: back at the upload step; nothing was sent (no
     emails in the console, no new rows on the achievement page). Upload
     `bulk.csv` again.

## B. Run it

- [ ] 7. Click **"Start Awarding"**. Expected: rows go **Pending → Processing… →**
     a result, one at a time, with a pause between rows (the interval). The bar
     and "{processed} of {total} processed" advance.
- [ ] 8. When it finishes, expected results per row:
     - _Member user_: **"Awarded"**, with a link to **`/claims/<id>`** (the new claim).
       An "awarded" email to the _Member user_ is in the console.
     - _Bulk invitee_: **"Awarded"**, with a link to **`/invites/<id>`**. An
       invitation email to the _Bulk invitee_ is in the console.
     - _Invitee user_: **"Already invited (updated)"**. They already hold the badge
       and the _Admin_ invited them in journey 5, so **no** email is sent.
     - `not-an-email`: **"Error"**, with the validation message.
     - The summary reads "2 awarded, 1 updated, 1 failed out of 4".
- [ ] 9. Click **"Retry Failed"**. Expected: only the `not-an-email` row runs again
     and fails again (Retry resends the same row data; it is for transient errors).
     The other rows keep their results.

## C. Re-running sends no duplicate emails

- [ ] 10. Note how many emails are in the console. Go back to
      **`/achievements/<Invite-only id>/award/bulk`**, upload **`bulk.csv`** again
      and start. Expected: _Member user_, _Bulk invitee_ and _Invitee user_ are all
      **"Already invited (updated)"**; `not-an-email` fails again; **no new emails**
      appear in the console.
- [ ] 11. Fix the bad row in `bulk.csv` (replace `not-an-email` with another fresh
      address), and upload and run it again. Expected: that row is **"Awarded"**
      with one invitation email; the other three stay "Already invited (updated)"
      with no emails.

## D. Invites list and the invite page

- [ ] 12. As _Admin_, open **`/achievements/<Invite-only id>`** → the **Invites** tab.
      Expected: the _Bulk invitee_ and the address from step 11 are listed, and each
      email links to **`/invites/<id>`**.
- [ ] 13. Open the _Bulk invitee_'s invite. Expected: the invite page shows the
      recipient email, who invited them, when, the narrative/evidence if any, and
      "Invitation pending — the recipient has not yet joined or claimed this
      achievement."
- [ ] 14. Click **"Delete invite"**. Expected: a confirmation dialog. **Cancel**
      closes it and nothing changes. Open it again and click **"Delete"**. Expected:
      "Invite deleted successfully", you land on the achievement page, and the row is
      gone from the Invites tab. (The old invite link now fails: opening
      `/achievements/<id>/claim?i=<inviteId>&e=…` no longer authorizes a claim.)
- [ ] 15. Open the **_Member user_**'s claim from step 8 (`/claims/<id>`). Expected:
      an _Invite-only_ claim for the _Member user_, created by the _Admin_.

## E. Access — **member-only** checks

- [ ] 16. As the **_Member user_** (non-admin), open
      **`/achievements/<Invite-only id>/award/bulk`** directly. Expected: redirected
      to **`/achievements/<Invite-only id>`**, the same as the single award page
      (`/award`). (If journey 2 set `capabilities.inviteRequires` on _Invite-only_ to
      a badge the _Member user_ holds, they **can** award, in bulk too. That's
      expected.)
- [ ] 17. As the _Member user_, open **`/invites/<id>`** for an invite the _Admin_
      created. Expected: 403. Logged out, the same URL redirects to `/login?next=…`.

## State produced

- _Member user_ holds _Invite-only_ (an awarded claim).
- Two bulk invites; one was deleted in step 14.

## e2e candidate

**Yes, P2.** Seam: the standard `tests/playwright/globals/setup.ts` seed (one org,
one claimable achievement) needs an admin session and an existing member. Drive
the page with a small CSV fixture via `setInputFiles`, assert the per-row statuses
and the summary line, then re-run and assert the second pass is all "updated".
Assert emails through the JSON mail transport rather than the console. The server
gating and the no-duplicate-email rule are already unit-tested.

## Citations

- Routes: [`src/routes/achievements/[id]/award/bulk/+page.svelte`](../../src/routes/achievements/%5Bid%5D/award/bulk/+page.svelte),
  [`src/routes/achievements/[id]/award/bulk/+page.server.ts`](../../src/routes/achievements/%5Bid%5D/award/bulk/+page.server.ts),
  [`src/routes/api/[[version]]/achievements/[id]/award/+server.ts`](../../src/routes/api/%5B%5Bversion%5D%5D/achievements/%5Bid%5D/award/+server.ts),
  [`src/routes/invites/[inviteId]/+page.svelte`](../../src/routes/invites/%5BinviteId%5D/+page.svelte),
  [`src/routes/api/[[version]]/achievements/[id]/invites/[inviteId]/+server.ts`](../../src/routes/api/%5B%5Bversion%5D%5D/achievements/%5Bid%5D/invites/%5BinviteId%5D/+server.ts).
- Components: [`src/lib/components/bulk-award/`](../../src/lib/components/bulk-award/).
- The duplicate-email guard: `emailIfNew` in `inviteToClaim`
  ([`src/lib/data/achievement.ts`](../../src/lib/data/achievement.ts)).
