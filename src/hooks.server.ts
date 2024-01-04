import * as m from '$lib/i18n/messages';
import { error, type Handle, type RequestEvent } from '@sveltejs/kit';
import cookie from 'cookie';
import { prisma } from './prisma/client';
import {
	setLanguageTag,
	availableLanguageTags,
	type AvailableLanguageTag
} from '$lib/i18n/runtime';
import type { Organization } from '@prisma/client';
import { DEFAULT_ORG_ENABLED, DEFAULT_ORG_DOMAIN } from '$env/static/private';

const getOrganizationFromRequest = async function (event: RequestEvent) {
	const domain = event.url.host || '';

	let org = await prisma.organization.findUnique({
		where: { domain }
	});
	if (!org && DEFAULT_ORG_ENABLED === 'true') {
		org = await prisma.organization.findUniqueOrThrow({
			where: { domain: DEFAULT_ORG_DOMAIN || '' }
		});
	} else if (!org) {
		throw error(404, m.organization_notFoundError());
	}

	return org;
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
	try {
		event.locals.org = await getOrganizationFromRequest(event);
	} catch (error) {
		console.log(error.message);
	}

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
