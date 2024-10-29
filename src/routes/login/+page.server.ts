import * as m from '$lib/i18n/messages';
import { sendOrcaMail, transporter } from '$lib/email/sendEmail';
import { error, redirect } from '@sveltejs/kit';
import type { Actions } from '@sveltejs/kit';
import * as dotenv from 'dotenv';
import { prisma } from '$lib/../prisma/client';
import type { Session, User } from '@prisma/client';
import stripTags from '$lib/utils/stripTags';
import type { ClaimEndorsement } from '@prisma/client';
import type { PageServerLoad } from './$types';
import { INVITE_SESSION_VALIDITY_MS } from '$lib/utils/session';

dotenv.config();

export const load: PageServerLoad = async ({ locals, url }) => {
	const nextPath = url.searchParams.get('next');

	// redirect user if logged in
	if (locals.session) {
		throw redirect(302, '/');
	}

	const inviteId = url.searchParams.get('i');
	const inviteeEmail = url.searchParams.get('e');
	if (inviteId) {
		const invite = await prisma.claimEndorsement.findUnique({ where: { id: inviteId } });

		// If invite is not found, doesn't match email, or is already claimed: Error
		if (!invite || inviteeEmail != invite?.inviteeEmail || invite?.claimId)
			throw error(404, m.invite_notFoundError());
	}

	return {
		inviteId,
		inviteeEmail,
		nextPath
	};
};

export const actions: Actions = {
	login: async ({
		cookies,
		locals,
		request
	}): Promise<{ sessionId: string; register?: boolean }> => {
		const requestData = await request.formData();
		const email = stripTags(requestData.get('email')?.toString());
		const inviteId = stripTags(requestData.get('inviteId')?.toString());
		if (!email || !email.toString().includes('@')) throw error(400, m.login_emailNotParsedError());

		// Validate org and ensure user exists
		let userIdentifier = await prisma.identifier.findFirst({
			where: {
				type: 'EMAIL',
				identifier: email,
				verifiedAt: {
					not: null
				},
				organizationId: locals.org.id
			}
		});

		// If user doesn't have an outstanding invite, don't proceed to create a session.
		let outstandingInvite: ClaimEndorsement | null = null;
		if (inviteId) {
			outstandingInvite = await prisma.claimEndorsement.findUnique({ where: { id: inviteId } });
			if (!outstandingInvite) throw error(400, m.login_invitationRequiredError());
		} else if (!userIdentifier) {
			throw error(400, m.login_invitationRequiredError());
		}

		const code = Math.floor(100000 + Math.random() * 900000).toString();
		const session = await prisma.session.create({
			data: {
				code: code,
				expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
				user: userIdentifier ? { connect: { id: userIdentifier.userId } } : undefined,
				organization: { connect: { id: locals.org.id } },
				invite: outstandingInvite ? { connect: { id: inviteId } } : undefined
			}
		});

		const emailResult = await sendOrcaMail({
			from: locals.org.email,
			to: email,
			subject: m.login_toCommunityNameCTA({ orgName: locals.org.name }),
			text: m.login_emailVerificationCodeIs({ code })
		});
		if (!emailResult.success) {
			throw error(500, m.email_transmissionError({ message: emailResult.error?.message ?? '' }));
		}

		cookies.set('sessionId', session.id, {
			secure: process.env.USE_SECURE_COOKIES == 'true',
			path: '/',
			expires: session.expiresAt,
			httpOnly: true
		});
		return { sessionId: session.id };
	},

	verify: async ({
		locals,
		cookies,
		request
	}): Promise<{
		sessionId?: string;
		session?: Omit<Session, 'code' | 'createdAt' | 'userId'> & { user: User | null };
		location?: string;
		register?: boolean;
		success?: boolean;
	}> => {
		const requestData = await request.formData();
		const vcode = requestData.get('verificationCode')?.toString();
		const sessionId = cookies.get('sessionId');
		const nextPath = requestData.get('nextPath')?.toString();

		if (!vcode) throw error(400, m.login_verificationCodeRequiredError());
		// Validate sessionid and ensure code matches
		// TODO: use unique indexed query for session somehow
		// TODO: prevent brute force guessing
		const session = await prisma.session.findFirst({
			where: {
				code: vcode,
				id: sessionId,
				organizationId: locals.org.id,
				valid: false
			},
			include: {
				user: true,
				invite: true
			}
		});
		if (!session) throw error(401, m.login_incorrectCodeError());

		// Advance user to next step in invite claim: user account creation.
		if (!session.userId && session.invite?.inviteeEmail) return { success: true, register: true };

		const activatedSession = await prisma.session.update({
			where: {
				id: sessionId
			},
			data: {
				valid: true
			},
			select: {
				user: true,
				id: true,
				valid: true,
				organizationId: true,
				inviteId: true,
				createdAt: false,
				expiresAt: true,
				code: false
			}
		});

		if (session.invite)
			return {
				session: activatedSession,
				location: `/achievements/${session.invite.achievementId}/claim?i=${
					session.invite.id
				}&e=${encodeURIComponent(session.invite.inviteeEmail)}`
			};
		else
			return {
				session: activatedSession,
				location: nextPath && nextPath?.startsWith('/') ? nextPath : '/'
			};
	},
	register: async ({
		locals,
		cookies,
		request
	}): Promise<{
		sessionId?: string;
		session?: Omit<Session, 'code' | 'createdAt' | 'userId'> & { user: User | null };
		location?: string;
		register?: boolean;
		success?: boolean;
	}> => {
		const requestData = await request.formData();
		const vcode = requestData.get('verificationCode')?.toString();
		const sessionId = cookies.get('sessionId');
		const inviteId = requestData.get('inviteId')?.toString();
		const givenName = stripTags(requestData.get('givenName')?.toString()) || '';
		const familyName = stripTags(requestData.get('familyName')?.toString()) || '';
		const agreeTerms = stripTags(requestData.get('agreeTerms')?.toString()) || 'no';

		if (!vcode && !inviteId) throw error(400, m.login_incorrectCodeError());
		if (agreeTerms == 'no') throw error(400, m.login_agreeTermsError());

		let session;
		let currentInvite;
		// TODO there's more to this conditional
		if (inviteId && !sessionId) {
			currentInvite = await prisma.claimEndorsement.findFirst({
				where: {
					id: inviteId
				}
			});
			// If the invite is no longer fresh, it is valid to confirm control of the email it was sent to.
			if (
				currentInvite?.createdAt &&
				Date.now() > currentInvite.createdAt.getTime() + INVITE_SESSION_VALIDITY_MS
			) {
				// User will be required to login by email if their invite is stale.
				throw error(401, { message: m.unauthenticatedError(), code: 'invite_expired' });
			}
		}

		if (!currentInvite) {
			// Validate sessionid and ensure code matches
			// TODO: use unique indexed query for session somehow
			// TODO: prevent brute force guessing
			session = await prisma.session.findFirst({
				where: {
					code: vcode,
					id: sessionId,
					organizationId: locals.org.id
				},
				include: {
					invite: true
				}
			});

			if (!session) throw error(401, m.login_incorrectCodeError());

			if (session.userId || !session.invite?.inviteeEmail)
				throw error(401, m.register_genericError());
		}

		const userEmail = currentInvite?.inviteeEmail ?? session?.invite?.inviteeEmail;
		if (!userEmail) throw error(400, m.register_genericError());

		const user = await prisma.user.create({
			data: {
				givenName,
				familyName,
				organization: { connect: { id: locals.org.id } },
				identifiers: {
					create: [
						{
							type: 'EMAIL',
							identifier: userEmail,
							organization: { connect: { id: locals.org.id } },
							verifiedAt: new Date()
						}
					]
				},
				...(sessionId
					? {}
					: {
							sessions: {
								create: [
									{
										code: '',
										expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
										organization: { connect: { id: locals.org.id } },
										valid: true
									}
								]
							}
					  })
			},
			include: {
				sessions: true
			}
		});

		if (sessionId) {
			const activatedSession = await prisma.session.update({
				where: {
					id: sessionId
				},
				data: {
					valid: true,
					user: { connect: { id: user.id } }
				},
				select: {
					user: true,
					id: true,
					createdAt: false,
					expiresAt: true,
					code: false,
					invite: true,
					inviteId: true,
					organizationId: true,
					valid: true
				}
			});

			const invite = activatedSession.invite;

			if (invite?.achievementId && invite) {
				return {
					session: activatedSession,
					location: `/achievements/${invite.achievementId}/claim?i=${
						invite.id
					}&e=${encodeURIComponent(invite.inviteeEmail ?? '')}`
				};
			} else return { session: activatedSession, location: '/' };
		}

		const currentSession = user.sessions[0];
		cookies.set('sessionId', currentSession.id, {
			secure: process.env.USE_SECURE_COOKIES == 'true',
			path: '/',
			expires: currentSession.expiresAt,
			httpOnly: true
		});

		return {
			session: { ...currentSession, user },
			location: currentInvite
				? `/achievements/${currentInvite.achievementId}/claim?i=${
						currentInvite.id
				  }&e=${encodeURIComponent(currentInvite.inviteeEmail ?? '')}`
				: '/'
		};
	}
};
