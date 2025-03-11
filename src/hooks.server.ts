import * as m from '$lib/i18n/messages';
import { error, type Handle, type RequestEvent } from '@sveltejs/kit';
import cookie from 'cookie';
import { prisma } from './prisma/client';
import {
	setLanguageTag,
	availableLanguageTags,
	type AvailableLanguageTag
} from '$lib/i18n/runtime';
import { DEFAULT_ORG_ENABLED, DEFAULT_ORG_DOMAIN } from '$env/static/private';

const getOrganizationFromRequest = async function (event: RequestEvent) {
	const domain = event.url.host || '';

	let orgs = await prisma.organization.findMany({
		where: {
			domain: DEFAULT_ORG_ENABLED === 'true' ? { in: [domain, DEFAULT_ORG_DOMAIN ?? ''] } : domain
		}
	});
	if (orgs.length == 0) {
		throw error(404, m.organization_notFoundError());
	}

	return orgs.find((org) => org.domain === domain) || orgs[0];
};

const getSession = async function (sessionId: string, orgId: string) {
	const session = await prisma.session.findFirst({
		where: {
			id: sessionId,
			organizationId: orgId
		},
		select: {
			id: true,
			valid: true,
			expiresAt: true,
			user: {
				select: {
					id: true,
					givenName: true,
					familyName: true,
					organizationId: true,
					orgRole: true,
					identifiers: true,
					defaultVisibility: true
				}
			}
		}
	});
	if (session?.valid && new Date(session.expiresAt).getTime() > Date.now()) return session;
	return null;
};

const getAuthHeaderTokenValue = function (authHeader: string | null) {
	if (!authHeader) return null;
	const parts = authHeader.split(' ');
	if (parts[0] !== 'Bearer' || !parts[1]) return null;
	return parts[1];
};

export const handle: Handle = async function ({ event, resolve }) {
	event.locals.org = await getOrganizationFromRequest(event);

	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	const sessionId =
		cookies.sessionId ?? getAuthHeaderTokenValue(event.request.headers.get('Authorization'));
	if (sessionId) {
		event.locals.session = await getSession(sessionId, event.locals.org.id);
	}
	event.locals.locale = availableLanguageTags.includes(cookies.locale as AvailableLanguageTag)
		? (cookies.locale as AvailableLanguageTag)
		: 'en-US';
	setLanguageTag(event.locals.locale);
	const theme = ['dark', 'light'].includes(cookies.theme) ? cookies.theme : 'default';

	const response = await resolve(event);

	if (!cookies.theme)
		response.headers.append(
			'set-cookie',
			`theme=${theme};path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`
		);
	if (!cookies.locale)
		response.headers.append(
			'set-cookie',
			`locale=${event.locals.locale};path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`
		);

	return response;
};
