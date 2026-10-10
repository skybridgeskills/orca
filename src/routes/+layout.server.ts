import { sanitizeOrganizationForClient } from '$lib/server/organization';
import { canViewMemberDirectory } from '$lib/server/permissions';

import type { LayoutServerLoad } from './$types';

// get `locals.user` and pass it to the `page` store
export const load: LayoutServerLoad = async ({ locals, cookies }) => {
	const user = locals.session?.user;
	return {
		cookieTheme: cookies.get('theme'),
		session: locals.session,
		org: sanitizeOrganizationForClient(locals.org),
		locale: locals.locale,
		// Hide the Members nav item from non-members under membership gating.
		showMembersNav: user ? await canViewMemberDirectory({ user, org: locals.org }) : false
	};
};
