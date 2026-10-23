# Data Model and Prisma Query System

ORCA uses [Prisma](https://www.prisma.io/) as its ORM to interact with a PostgreSQL database. The schema defines the data model and relationships.

## Schema Location

The Prisma schema is located at `src/prisma/schema.prisma`.

## Core Models

### Organization

The root entity that scopes all other data. Each organization represents a community/tenant.

- `id`: UUID primary key
- `domain`: Unique domain identifier (used for multi-tenancy)
- `name`, `description`, `email`: Basic org info
- `json`: JSON field containing org configuration (`orgStatus`, `tagline`, etc.)
- `logo`, `primaryColor`: Branding

### User

Represents a user within an organization.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `givenName`, `familyName`: User's name
- `orgRole`: Role within the org (`GENERAL_ADMIN`, `BILLING_ADMIN`, `CONTENT_ADMIN`)
- `defaultVisibility`: Visibility copied into the user's new claims (default
  `PUBLIC`; see [Claim visibility](#claim-visibility))
- `json`: JSON field for user preferences, including
  `notifications.email` (email notifications on/off; default on when unset)

### Achievement

A badge template that can be claimed or awarded.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `identifier`: Unique identifier within the organization
- `name`, `description`: Achievement details
- `criteriaNarrative`: Text describing what qualifies for this achievement
- `image`: Image URL for the badge
- `achievementStatus`: `ACTIVE` or `ARCHIVED`
- `claimable`: Whether the achievement can be claimed
- `claimRequiresId`: Optional self-relation FK to a prerequisite Achievement
  (`claimRequires` / `claimRequiredBy`, relation `ClaimPrereq`)
- `reviewRequiresId`: Optional self-relation FK to the Achievement a reviewer must
  hold (`reviewRequires` / `reviewEnabledBy`, relation `ReviewBadge`)
- `json`: JSON field for additional metadata, including `alignment`,
  `reviewsRequired` (number of reviews needed, 0-5),
  `capabilities.inviteRequires` (achievement that gates who may invite),
  `claimTemplate`, `stewards` (array of user IDs who can approve a claim
  directly — an additive overlay on any review rule; see ADR
  `2026-06-09-steward-review-and-messaging`), and `resultDescriptions` (the current
  review rubric — OB3 `ResultDescription`s; see ADR
  `2026-06-09-achievement-rubrics-results`)

**Unique constraint**: `(organizationId, identifier)` - ensures achievements are unique within an org.

> Claim/review configuration was previously held in a separate 1:1
> `AchievementConfig` satellite. It was flattened into `Achievement` (queryable
> fields as columns; the rest in `json`); see ADR
> `2026-06-09-achievement-config-merge`.

### AchievementClaim

A user's request to earn a badge for an achievement.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `userId`: Foreign key to User (the claimant)
- `achievementId`: Foreign key to Achievement
- `claimStatus`: `ACCEPTED`, `REJECTED`, or `UNACCEPTED`
- `json`: JSON field for claim narrative and evidence
- `validFrom`, `validUntil`: Optional validity period
- `visibility`: Who can see this claim (default `PUBLIC`; see
  [Claim visibility](#claim-visibility))
- `credentialId`: Unique foreign key to the claim's **cached** `AchievementCredential`
  (relation `CachedCredential`), used by the JSON download and the OB3 API
- `issuedCredentials`: Every `AchievementCredential` issued for this claim (relation
  `IssuedCredentials`), cached and holder-bound
- `exchanges`: Open `CredentialExchange` rows for Send to wallet

**Unique constraint**: `(userId, achievementId)` - a user can only have one claim per achievement.

### AchievementCredential

A credential (badge) that has been issued to a user.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `achievementId`: Foreign key to Achievement
- `subjectId`: The user's identifier (for credential subject)
- `creatorUserId`: Foreign key to User who created/issued the credential
- `identifier`: Unique identifier for the credential
- `json`: JSON field containing the full credential data (OpenBadges format)
- `claimId`: Foreign key to the claim it was issued for (relation `IssuedCredentials`,
  `ON DELETE CASCADE`; indexed)

A claim has one **cached** credential, which the claim's `credentialId` points at. Its
subject is an org-generated `did:web:<org>:u:<user>`. A claim can also have any number of
**holder-bound** credentials, one per completed Send to wallet exchange: the subject is the
wallet's DID-authenticated holder DID, and each has a fresh `urn:uuid` id. Every row has
`claimId` set. See ADR 2026-10-12-orca-hosted-vc-api-claim-exchange.

### CredentialExchange

Ephemeral VC-API claim exchange state for orgs that sign locally (transaction-service orgs
keep this state in the service). Nothing permanent lives here; the issued credential is an
`AchievementCredential` with `claimId`.

- `id`: UUID primary key; it appears in the wallet-facing URLs, so it is the capability
- `organizationId`, `claimId`: foreign keys (the claim FK is `ON DELETE CASCADE`)
- `challenge`: DID-auth challenge
- `expiresAt`: creation + 15 minutes (indexed for the purge)
- `startedAt`: set when a wallet fetches the DID-auth request
- `completedAt`: single-use marker, set when a credential is issued
- `errors`: JSON array of `{ code, message, at }` (sanitized, no presentation content)

State is derived, not stored: `complete` if `completedAt` is set, otherwise `invalid` if
`errors` has entries, otherwise `active` if `startedAt` is set, otherwise `pending`. The
daily `/api/cron/purge-messages` job deletes rows that expired more than 24 hours ago.

### ClaimEndorsement

An invitation sent to an email to claim a specific achievement. Also used for claim reviews.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `achievementId`: Foreign key to Achievement
- `inviteeEmail`: Email address of the invitee
- `creatorId`: Foreign key to User who created the invite
- `claimId`: Optional foreign key to AchievementClaim (set when invite is accepted)
- `claimStatus`: `ACCEPTED`, `REJECTED`, or `UNACCEPTED`
- `json`: JSON field for invitation details

**Unique constraint**: `(creatorId, achievementId, inviteeEmail)` - prevents duplicate invites.

### Message

A log of user-directed messages (e.g. steward review notifications). A row is written
only on a successful send; used for notification throttling and 30-day retention. See
ADR `2026-06-09-steward-review-and-messaging`.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `userId`: Foreign key to User (the recipient)
- `type`: `MessageType` enum (`REVIEW_NEEDED`)
- `achievementId`, `claimId`: Optional loose references (no FK) for context + throttling
- `createdAt`: Timestamp (used for the 3-day throttle window and 30-day GC)

**Indexes**: `(userId, type, achievementId, createdAt)` for throttle queries;
`(organizationId, createdAt)` for GC.

### Profile

A community profile (e.g., creator profile) distinct from User accounts.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `identifier`: Unique identifier within the organization
- `name`, `email`: Profile details
- `json`: JSON field for additional metadata

**Unique constraint**: `(organizationId, identifier)` - ensures profiles are unique within an org.

### Session

User session for authentication.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `code`: Session code/token
- `userId`: Optional foreign key to User
- `valid`: Whether the session is valid
- `expiresAt`: Expiration timestamp
- `inviteId`: Optional foreign key to ClaimEndorsement (for invite-based sessions)

## Claim visibility

Each `AchievementClaim` has a `visibility`. The rule lives in
`src/lib/server/claimVisibility.ts` (see ADR
`2026-06-09-claim-visibility-authorization`), and every claim read surface uses it.

| Viewer                                                                                        | Sees                                                   |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| The claim's owner                                                                             | All of their own claims, including `PRIVATE`           |
| An org admin                                                                                  | Every claim in the org                                 |
| A member (an admin, a holder of the membership badge, or any signed-in user when none is set) | `PUBLIC`, `COMMUNITY` and `ACHIEVEMENT`                |
| A signed-in non-member (membership badge set)                                                 | `PUBLIC` and their own                                 |
| An org app (`client_credentials` token)                                                       | `PUBLIC`, `COMMUNITY` and `ACHIEVEMENT`, like a member |
| Anyone else (signed out, OB2 assertion links, share pages)                                    | `PUBLIC` only; anything else is a 404                  |

`ACHIEVEMENT` is treated as `COMMUNITY` until it gets a policy of its own.

**New claims snapshot the claimant's `User.defaultVisibility`,** both on a
self-claim and when an admin or inviter awards the badge to an existing member.
Changing the default later doesn't change existing claims. New users default to
`PUBLIC`, and so does the column itself.

**At the release that started enforcing visibility, existing claims and user
defaults were moved from `COMMUNITY` to `PUBLIC`**
(migration `backfill_claim_visibility_public`). Before then, visibility was stored
but never enforced, and every row carried the old column default `COMMUNITY`.
Without the backfill, enforcement would have 404'd every issued OB2 assertion and
share link to outsiders. Rows explicitly set to `PRIVATE` or `ACHIEVEMENT` were
left alone. Privacy is opt-in: members choose it in their settings (the default for new
badges) or per badge on the claim page.

## IDs

All primary keys use UUID (`@id @default(uuid())`).

## Naming Conventions

- **Tables**: Singular snake_case (e.g., `Achievement`, `AchievementClaim`)
- **JSON columns**: Named `json` (not suffixed with `_json` like some conventions)
- **Foreign keys**: `{modelName}Id` (e.g., `organizationId`, `userId`)

## Query Patterns

### Organization Scoping

**Critical**: All queries must be scoped by `organizationId` to ensure data isolation. The organization is available from `event.locals.org.id` in SvelteKit handlers.

**Example**:

```typescript
import { prisma } from '$lib/prisma/client';

// Get all achievements for the current organization
const achievements = await prisma.achievement.findMany({
	where: {
		organizationId: event.locals.org.id
	}
});

// Get a specific achievement within the org
const achievement = await prisma.achievement.findFirst({
	where: {
		id: achievementId,
		organizationId: event.locals.org.id
	}
});
```

### Common Query Patterns

**Find with relations**:

```typescript
const claim = await prisma.achievementClaim.findFirst({
	where: {
		id: claimId,
		organizationId: event.locals.org.id
	},
	include: {
		achievement: true,
		user: true,
		credential: true
	}
});
```

**Create with organization**:

```typescript
const achievement = await prisma.achievement.create({
	data: {
		organizationId: event.locals.org.id,
		name: 'New Achievement',
		description: 'Description',
		identifier: 'unique-id',
		json: {}
	}
});
```

**Update scoped by organization**:

```typescript
await prisma.achievementClaim.update({
	where: {
		id: claimId,
		organizationId: event.locals.org.id
	},
	data: {
		claimStatus: 'ACCEPTED'
	}
});
```

## Enums

### Visibility

- `PUBLIC` - Visible to everyone
- `COMMUNITY` - Visible to community members
- `ACHIEVEMENT` - Visible to achievement holders
- `PRIVATE` - Only visible to the user

### RoleType

- `GENERAL_ADMIN` - Full admin access
- `BILLING_ADMIN` - Billing administration
- `CONTENT_ADMIN` - Content administration

### ClaimStatus

- `ACCEPTED` - Claim/badge has been accepted
- `REJECTED` - Claim/badge has been rejected
- `UNACCEPTED` - Pending acceptance

### AchievementStatus

- `ACTIVE` - Achievement is active
- `ARCHIVED` - Achievement is archived

## Relationships

Most models have a direct relationship to `Organization` via `organizationId`. This ensures:

1. **Data isolation**: Each organization's data is separate
2. **Multi-tenancy**: One database can serve multiple organizations
3. **Query safety**: All queries must include organization scoping

See [organization-tenancy.md](organization-tenancy.md) for more details on how organization scoping works.

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [Organization Tenancy](organization-tenancy.md)
- [Schema File](../src/prisma/schema.prisma)
