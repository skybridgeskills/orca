import type { LayoutServerLoad } from './$types';

// get `locals.user` and pass it to the `page` store
export const load: LayoutServerLoad = ({ locals, cookies }) => {
	return {
		cookieTheme: cookies.get('theme'),
		session: locals.session,
		org: locals.org,
		locale: locals.locale
	};
};
