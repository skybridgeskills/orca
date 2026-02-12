import * as m from '$lib/i18n/messages';
import { error, type Handle, type RequestEvent } from '@sveltejs/kit';
import cookie from 'cookie';
import { prisma } from './prisma/client';
import { setLocale, locales } from '$lib/i18n/runtime';
import { paraglideMiddleware } from '$lib/i18n/server';
import { DEFAULT_ORG_ENABLED, DEFAULT_ORG_DOMAIN } from '$env/static/private';
import { getLanguageForRequest } from '$lib/utils/language-selection';

export const getOrgStatus = (orgJson: App.OrganizationConfig): App.OrgStatus => {
	return orgJson.orgStatus ?? 'ENABLED';
};

export const getOrganizationFromRequest = async function (event: RequestEvent) {
	const domain = event.url.host || '';

	const orgs = await prisma.organization.findMany({
		where: {
			domain: DEFAULT_ORG_ENABLED === 'true' ? { in: [domain, DEFAULT_ORG_DOMAIN ?? ''] } : domain
		}
	});
	if (orgs.length == 0) {
		throw error(404, m.warm_top_parrot_drip());
	}

	const org = orgs.find((org) => org.domain === domain) || orgs[0];

	// Parse org.json and check status
	const orgJson: App.OrganizationConfig =
		typeof org.json === 'string' ? JSON.parse(org.json) : org.json || {};
	const orgStatus = getOrgStatus(orgJson);

	if (orgStatus === 'SUSPENDED') {
		throw error(503, m.sunny_watery_sparrow_jest());
	} else if (orgStatus === 'PENDING') {
		throw error(
			403,
			'This community is not yet activated. Please try again later. If you are the administrator, please check your email for activation instructions.'
		);
	}

	return org as App.Organization;
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

export const handle: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, async ({ request: localizedRequest, locale }) => {
		event.request = localizedRequest;

		event.locals.org = await getOrganizationFromRequest(event);

		const cookies = cookie.parse(event.request.headers.get('cookie') || '');
		const sessionId =
			cookies.sessionId ?? getAuthHeaderTokenValue(event.request.headers.get('Authorization'));
		if (sessionId) {
			event.locals.session = await getSession(sessionId, event.locals.org.id);
		}

		// Determine language using our selection logic (cookie → org default → en-US)
		const cookieLanguage = cookies.locale;
		const orgJson: App.OrganizationConfig =
			typeof event.locals.org.json === 'string'
				? JSON.parse(event.locals.org.json)
				: event.locals.org.json || {};
		const orgDefaultLanguage = orgJson.defaultLanguage;
		const selectedLanguage = getLanguageForRequest(cookieLanguage, orgDefaultLanguage, locales);

		// Use the selected language
		event.locals.locale = selectedLanguage;
		setLocale(event.locals.locale, { reload: false });
		const theme = ['dark', 'light'].includes(cookies.theme) ? cookies.theme : 'default';

		const response = await resolve(event, {
			transformPageChunk: ({ html }) => {
				return html.replace('%lang%', selectedLanguage);
			}
		});

		if (!cookies.theme)
			response.headers.append(
				'set-cookie',
				`theme=${theme};path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`
			);
		if (!cookies.locale)
			response.headers.append(
				'set-cookie',
				`locale=${selectedLanguage};path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`
			);

		return response;
	});
