# Open Badges 2.0 Routes

ORCA follows OB 3.0 conventions for the most part and offers OB 2.0 endpoints for legacy exports to platforms that do not yet support OB 3.0. Related objects are linked in the JSON using the [approach](https://www.imsglobal.org/spec/ob/v3p0/impl/#how-to-support-both-ob-2-0-and-ob-3-0-as-an-issuer) described in the OB 3.0 Implementation Guide

- `GET /ob2/a/[claimId]` - Get a badge assertion by a particular `AchievementClaim` id. Will return 200 OK for a valid claim that has been marked public by its holder and 404 Not Found for a valid claim that has not been marked public by its holder or for an invalid Claim ID. This is the equivalent endpoint to the `/b/[claimId]` endpoint in OB 3.0.
- `GET /ob2/b/[achievementId]` - Get a BadgeClass by a particular `Achievement` ID. "BadgeClass" is the OB 2.0 equivalent to the OB 3.0 term "Achievement". The related Achievement may be fetched from `/a/[achievementId]` in OB 3.0 syntax.
- `GET /ob2/i` - Get the issuer profile for this org. This is the equivalent endpoint to the `/.well-known/did.json` DID Document endpoint describing the issuer for OB 3.0 badges.
