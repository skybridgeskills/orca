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
	return await prisma.session.findFirst({
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
};

export const handle: Handle = async function ({ event, resolve }) {
	event.locals.org = await getOrganizationFromRequest(event);

	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	if (cookies.sessionId) {
		const session = await getSession(cookies.sessionId, event.locals.org.id);

		if (session?.valid && new Date(session.expiresAt).getTime() > Date.now())
			event.locals.session = session;
	}

	if (cookies.locale) {
		event.locals.locale = availableLanguageTags.includes(
			(cookies.locale as AvailableLanguageTag) ?? 'en-US'
		)
			? (cookies.locale as AvailableLanguageTag)
			: 'en-US';
	} else {
		event.locals.locale = 'en-US';
	}
	setLanguageTag(event.locals.locale);

	let theme = cookies.theme;

	if (theme !== 'dark' && theme !== 'light') theme = 'default';

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
