# Organization Tenancy and Data Isolation

ORCA implements multi-tenancy where each organization (community) has its own isolated data. All data queries must be scoped by `organizationId` to ensure proper isolation.

## Organization Resolution

### Request-Based Resolution

On every request, the organization is resolved from the request hostname via `getOrganizationFromRequest` in `src/hooks.server.ts`:

```typescript
export const getOrganizationFromRequest = async function (event: RequestEvent) {
	const domain = event.url.host || '';

	let orgs = await prisma.organization.findMany({
		where: {
			domain: DEFAULT_ORG_ENABLED === 'true' ? { in: [domain, DEFAULT_ORG_DOMAIN ?? ''] } : domain
		}
	});

	if (orgs.length == 0) {
		throw error(404, m.organization_notFoundError());
	}

	const org = orgs.find((org) => org.domain === domain) || orgs[0];
	// ... status checks ...
	return org;
};
```

The function:

1. Extracts the domain from `event.url.host`
2. Queries the `Organization` table for a matching `domain`
3. Falls back to `DEFAULT_ORG_DOMAIN` if `DEFAULT_ORG_ENABLED` is `true` (for local development)
4. Returns 404 if no organization is found
5. Checks organization status and returns appropriate errors if suspended or pending

### Organization in Locals

The resolved organization is stored in `event.locals.org` for use throughout the request:

```typescript
export const handle: Handle = async function ({ event, resolve }) {
	event.locals.org = await getOrganizationFromRequest(event);
	// ... rest of handler
};
```

The `org` object includes:

- All fields from the `Organization` model
- `json` field parsed as `App.OrganizationConfig` (see `src/app.d.ts`)

## Organization Configuration

The `json` field on `Organization` contains configuration:

```typescript
type OrganizationConfig = {
	tagline?: string;
	orgStatus?: 'ENABLED' | 'SUSPENDED' | 'UNDER_REVIEW' | 'PENDING';
	permissions?: {
		editAchievementCapability?: {
			requiresAchievement: string | null;
		};
	};
};
```

### Organization Status

Organizations can have different statuses:

- **ENABLED**: Normal operation (default)
- **SUSPENDED**: Returns 503 error - "This community is suspended or is experiencing technical problems"
- **PENDING**: Returns 403 error - "This community is not yet activated"
- **UNDER_REVIEW**: Not currently enforced, but may be used for future features

Status is checked in `getOrganizationFromRequest`:

```typescript
const orgStatus = getOrgStatus(orgJson);

if (orgStatus === 'SUSPENDED') {
	throw error(503, m.sunny_watery_sparrow_jest());
} else if (orgStatus === 'PENDING') {
	throw error(403, 'This community is not yet activated...');
}
```

## Data Isolation

### Critical Rule: Always Scope by Organization

**Every database query must include `organizationId: event.locals.org.id`** to ensure data isolation.

### Example: Correct Query

```typescript
// ✅ CORRECT: Scoped by organization
const achievements = await prisma.achievement.findMany({
	where: {
		organizationId: event.locals.org.id,
		achievementStatus: 'ACTIVE'
	}
});
```

### Example: Incorrect Query

```typescript
// ❌ WRONG: Missing organization scoping
const achievements = await prisma.achievement.findMany({
	where: {
		achievementStatus: 'ACTIVE'
	}
});
// This would return achievements from ALL organizations!
```

### Scoping in Different Contexts

**In SvelteKit load functions**:

```typescript
export const load = async ({ locals }) => {
	const achievements = await prisma.achievement.findMany({
		where: {
			organizationId: locals.org.id
		}
	});
	return { achievements };
};
```

**In API routes**:

```typescript
export const GET = async ({ locals }) => {
	const claims = await prisma.achievementClaim.findMany({
		where: {
			organizationId: locals.org.id,
			claimStatus: 'ACCEPTED'
		}
	});
	return json({ claims });
};
```

**In server actions**:

```typescript
export const createAchievement = async (event: RequestEvent, data: FormData) => {
	const achievement = await prisma.achievement.create({
		data: {
			organizationId: event.locals.org.id,
			name: data.get('name')
			// ... other fields
		}
	});
	return achievement;
};
```

## Multi-Tenancy Architecture

### Single Deployment, Multiple Organizations

ORCA is designed to serve multiple organizations from a single deployment:

- Each organization has a unique `domain` in the database
- Requests are routed to the correct organization based on the hostname
- All data is stored in the same database but isolated by `organizationId`

### Domain-Based Routing

Organizations are identified by their domain:

- `community1.example.com` → Organization with `domain: 'community1.example.com'`
- `community2.example.com` → Organization with `domain: 'community2.example.com'`

### Default Organization (Development)

For local development, you can set:

- `DEFAULT_ORG_ENABLED=true`
- `DEFAULT_ORG_DOMAIN=localhost:5173`

This allows `localhost:5173` to work even if it doesn't match any organization's domain.

## Data Model Relationships

All major models include `organizationId`:

- `User` → `organizationId`
- `Achievement` → `organizationId`
- `AchievementClaim` → `organizationId`
- `AchievementCredential` → `organizationId`
- `ClaimEndorsement` → `organizationId`
- `Profile` → `organizationId`
- `Session` → `organizationId`
- `SigningKey` → `organizationId`

This ensures that:

1. All data belongs to an organization
2. Queries can be scoped by organization
3. Data isolation is enforced at the database level

## Unique Constraints

Many models have unique constraints that include `organizationId`:

- `Achievement`: `@@unique([organizationId, identifier])`
- `Profile`: `@@unique([organizationId, identifier])`
- `Identifier`: `@@unique([organizationId, identifier])`
- `AchievementClaim`: `@@unique([userId, achievementId])` (implicitly scoped by org via userId)

This ensures uniqueness within an organization while allowing the same identifier in different organizations.

## Security Considerations

### Preventing Cross-Organization Access

Always validate that resources belong to the current organization:

```typescript
// ✅ CORRECT: Verify organization matches
const achievement = await prisma.achievement.findFirst({
	where: {
		id: achievementId,
		organizationId: event.locals.org.id
	}
});

if (!achievement) {
	throw error(404, 'Achievement not found');
}
```

### User Sessions

Sessions are scoped by organization. When checking a session:

```typescript
const session = await prisma.session.findFirst({
	where: {
		id: sessionId,
		organizationId: event.locals.org.id // ✅ Must match current org
	}
});
```

This ensures users can only use sessions from the organization they're accessing.

## References

- [Data Model](data-model.md) - Prisma schema and query patterns
- [Hooks Server](../src/hooks.server.ts) - Organization resolution implementation
- [App Types](../src/app.d.ts) - TypeScript types for organization config
