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
- `defaultVisibility`: Default visibility setting for user's data

### Achievement

A badge template that can be claimed or awarded.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `identifier`: Unique identifier within the organization
- `name`, `description`: Achievement details
- `criteriaNarrative`: Text describing what qualifies for this achievement
- `image`: Image URL for the badge
- `achievementStatus`: `ACTIVE` or `ARCHIVED`
- `json`: JSON field for additional metadata

**Unique constraint**: `(organizationId, identifier)` - ensures achievements are unique within an org.

### AchievementClaim

A user's request to earn a badge for an achievement.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `userId`: Foreign key to User (the claimant)
- `achievementId`: Foreign key to Achievement
- `claimStatus`: `ACCEPTED`, `REJECTED`, or `UNACCEPTED`
- `json`: JSON field for claim narrative and evidence
- `validFrom`, `validUntil`: Optional validity period
- `visibility`: Who can see this claim

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

### AchievementConfig

Configuration for how an achievement can be claimed and reviewed.

- `id`: UUID primary key
- `organizationId`: Foreign key to Organization (required)
- `achievementId`: Foreign key to Achievement (one-to-one)
- `claimable`: Whether the achievement can be claimed
- `claimRequiresId`: Optional foreign key to Achievement (prerequisite)
- `reviewRequiresId`: Optional foreign key to Achievement (required for reviewers)
- `reviewsRequired`: Number of reviews needed (0-5)
- `json`: JSON field for additional config (claim template, etc.)

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
