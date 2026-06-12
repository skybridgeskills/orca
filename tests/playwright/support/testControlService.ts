import { randomBytes, randomUUID } from 'node:crypto';

import { prisma } from '../../../src/prisma/client.js';

// Single seam through which the critical-path e2e specs create and read back
// data. Today it is backed directly by Prisma (the test runner shares a DB with
// the app). The interface is deliberately free of Prisma types so a future
// implementation (M4) can talk to a narrowly-scoped HTTP control surface
// instead, without touching any spec. Every method is org-scoped, matching the
// multi-tenant rule in docs/organization-tenancy.md.

export interface ProvisionOrgOptions {
	domain: string;
	name?: string;
	email?: string;
}

export interface CreateUserOptions {
	email: string;
	givenName?: string;
	familyName?: string;
}

export interface CreateAchievementOptions {
	name: string;
	claimable?: boolean;
	claimRequiresId?: string;
	description?: string;
	criteriaNarrative?: string;
}

export interface CreateClaimOptions {
	userId: string;
	achievementId: string;
	status?: 'ACCEPTED' | 'UNACCEPTED';
}

export interface TestControlService {
	provisionOrg(opts: ProvisionOrgOptions): Promise<{ orgId: string; domain: string }>;
	createAdminUser(orgId: string, opts: CreateUserOptions): Promise<{ userId: string }>;
	createMemberUser(orgId: string, opts: CreateUserOptions): Promise<{ userId: string }>;
	createSession(orgId: string, userId: string): Promise<{ sessionId: string }>;
	createAchievement(
		orgId: string,
		opts: CreateAchievementOptions
	): Promise<{ achievementId: string }>;
	createClaim(orgId: string, opts: CreateClaimOptions): Promise<{ claimId: string }>;
	getLatestOtp(opts: { orgId: string; email: string }): Promise<string | null>;
	getInviteFor(opts: {
		orgId: string;
		email: string;
		achievementId: string;
	}): Promise<{ inviteId: string } | null>;
	cleanupOrg(orgId: string): Promise<void>;
}

async function createUser(
	orgId: string,
	opts: CreateUserOptions,
	orgRole: 'GENERAL_ADMIN' | undefined
): Promise<{ userId: string }> {
	const user = await prisma.user.create({
		data: {
			organization: { connect: { id: orgId } },
			givenName: opts.givenName ?? 'Test',
			familyName: opts.familyName ?? 'User',
			orgRole,
			identifiers: {
				create: {
					type: 'EMAIL',
					identifier: opts.email,
					verifiedAt: new Date(),
					organization: { connect: { id: orgId } }
				}
			}
		}
	});
	return { userId: user.id };
}

export function createPrismaTestControlService(): TestControlService {
	return {
		async provisionOrg(opts) {
			const org = await prisma.organization.create({
				data: {
					domain: opts.domain,
					name: opts.name ?? 'E2E Critical Path Org',
					description: 'Organization provisioned for the critical-path e2e suite.',
					email: opts.email ?? 'noreply@orcapods.dev'
				}
			});
			return { orgId: org.id, domain: org.domain };
		},

		async createAdminUser(orgId, opts) {
			return createUser(orgId, opts, 'GENERAL_ADMIN');
		},

		async createMemberUser(orgId, opts) {
			return createUser(orgId, opts, undefined);
		},

		async createSession(orgId, userId) {
			// Mirrors the seeded-session idiom in oauth-connect.spec.ts: a valid,
			// non-expired session row whose id is dropped straight into the
			// `sessionId` cookie, skipping the magic-code login.
			const session = await prisma.session.create({
				data: {
					organization: { connect: { id: orgId } },
					user: { connect: { id: userId } },
					code: randomBytes(8).toString('hex'),
					valid: true,
					expiresAt: new Date(Date.now() + 60 * 60 * 1000)
				}
			});
			return { sessionId: session.id };
		},

		async createAchievement(orgId, opts) {
			// Open claim = claimable AND no claimRequiresId (see hooks/claim route).
			const achievement = await prisma.achievement.create({
				data: {
					organization: { connect: { id: orgId } },
					name: opts.name,
					description: opts.description ?? 'Seeded for the critical-path e2e suite.',
					criteriaNarrative: opts.criteriaNarrative ?? 'Awarded for e2e testing.',
					identifier: `urn:uuid:${randomUUID()}`,
					json: {},
					claimable: opts.claimable ?? true,
					...(opts.claimRequiresId
						? { claimRequires: { connect: { id: opts.claimRequiresId } } }
						: {})
				}
			});
			return { achievementId: achievement.id };
		},

		async createClaim(orgId, opts) {
			const claim = await prisma.achievementClaim.create({
				data: {
					organization: { connect: { id: orgId } },
					user: { connect: { id: opts.userId } },
					achievement: { connect: { id: opts.achievementId } },
					claimStatus: opts.status ?? 'ACCEPTED',
					validFrom: new Date(),
					// The app stores claim/endorsement json as a JSON *string* and
					// reads it back via JSON.parse(json.toString()) (see
					// evidenceItem); seed a string to match, not an object.
					json: '{}'
				}
			});
			return { claimId: claim.id };
		},

		async getLatestOtp(opts) {
			// The login action stores the 6-digit OTP in Session.code. The session
			// may be userless (invite flow) or tied to a user identifier; match
			// either so the same readback works for both registration and re-login.
			const session = await prisma.session.findFirst({
				where: {
					organizationId: opts.orgId,
					OR: [
						{ user: { identifiers: { some: { type: 'EMAIL', identifier: opts.email } } } },
						{ invite: { inviteeEmail: opts.email } }
					]
				},
				orderBy: { createdAt: 'desc' }
			});
			return session?.code ?? null;
		},

		async getInviteFor(opts) {
			const endorsement = await prisma.claimEndorsement.findFirst({
				where: {
					organizationId: opts.orgId,
					inviteeEmail: opts.email,
					achievementId: opts.achievementId
				},
				orderBy: { createdAt: 'desc' }
			});
			return endorsement ? { inviteId: endorsement.id } : null;
		},

		async cleanupOrg(orgId) {
			// Delete child rows before parents to satisfy FKs. Sessions reference
			// invites (ClaimEndorsement) and users; endorsements reference claims;
			// claims/configs reference achievements; identifiers reference users.
			await prisma.oAuthAccessToken.deleteMany({ where: { organizationId: orgId } });
			await prisma.oAuthAuthorizationCode.deleteMany({ where: { organizationId: orgId } });
			await prisma.oAuthClient.deleteMany({ where: { organizationId: orgId } });
			await prisma.session.deleteMany({ where: { organizationId: orgId } });
			await prisma.claimEndorsement.deleteMany({ where: { organizationId: orgId } });
			await prisma.achievementClaim.deleteMany({ where: { organizationId: orgId } });
			await prisma.achievementCredential.deleteMany({ where: { organizationId: orgId } });
			await prisma.achievement.deleteMany({ where: { organizationId: orgId } });
			await prisma.identifier.deleteMany({ where: { organizationId: orgId } });
			await prisma.user.deleteMany({ where: { organizationId: orgId } });
			await prisma.signingKey.deleteMany({ where: { organizationId: orgId } });
			await prisma.organization.delete({ where: { id: orgId } });
		}
	};
}
