# Glossary

Glossary of terms used in ORCA.

## User-Facing Terms

| Term        | Description                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| achievement | A badge template that can be claimed or awarded to members of a community. Defines what skills or accomplishments are recognized.  |
| badge       | A credential awarded to a user for an achievement. It makes the claim that the user has completed the criteria of the achievement. |
| claim       | A user's request to earn a badge for an achievement. May require review before being accepted.                                     |
| community   | An organization with its own domain, achievements, and members. Each community operates independently.                             |
| invite      | An invitation sent to an email address to claim a specific achievement. When accepted, creates a claim.                            |

## Technical Terms

| Term                  | Description                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| organization          | Tenant/community in the database. Identified by domain; scopes all data. Each organization has its own achievements, users, claims, and credentials.                       |
| ClaimEndorsement      | Database model representing an invite. Links creator, invitee email, and achievement. May reference an AchievementClaim when the invite is accepted.                       |
| Profile               | A community profile (e.g., creator profile) distinct from User accounts. Has its own identifier and organizationId. Used for representing entities that issue credentials. |
| Paraglide             | Compiler-based i18n library used in ORCA. Emits tree-shakable message functions from JSON translation files. See [i18n.md](i18n.md).                                       |
| AchievementCredential | A credential (badge) that has been issued. Contains the full OpenBadges-compliant credential data in JSON format.                                                          |
| AchievementConfig     | Configuration for how an achievement can be claimed and reviewed. Defines prerequisites, review requirements, and claim templates.                                         |
| Visibility            | Enum controlling who can see a resource. Values: `PUBLIC`, `COMMUNITY`, `ACHIEVEMENT`, `PRIVATE`.                                                                          |
| ClaimStatus           | Status of a claim or invite. Values: `ACCEPTED`, `REJECTED`, `UNACCEPTED`.                                                                                                 |
| AchievementStatus     | Status of an achievement. Values: `ACTIVE`, `ARCHIVED`.                                                                                                                    |
| organizationId        | Foreign key field present on most models. Used to scope all queries and ensure data isolation between organizations.                                                       |

## Related Documentation

- [Data Model](data-model.md) - Detailed schema and query patterns
- [Organization Tenancy](organization-tenancy.md) - How multi-tenancy works
- [i18n System](i18n.md) - Internationalization and translation system
