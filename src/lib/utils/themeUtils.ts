import cookie from 'cookie';
import { browser } from '$app/environment';

export const updateCookie = (preferredTheme: string) => {
	if (!browser) return;

	const cookies = cookie.parse(document.cookie || '');
	const cookieTheme = cookies.theme;

	if (preferredTheme == 'dark')
		document.cookie = `theme=dark;path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`;
	else document.cookie = `theme=light;path=/;expires=Fri, 31 Dec 2099 23:59:59 GMT`;
};
