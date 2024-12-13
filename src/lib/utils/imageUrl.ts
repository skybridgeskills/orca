import { PUBLIC_HTTP_PROTOCOL, PUBLIC_MEDIA_DOMAIN } from '$env/static/public';
import type { Achievement, Organization } from '@prisma/client';

/**
 * This function takes an achievement with its organization data and returns a url to our server that
 * will redirect to the achievement image at the CDN. This is useful when we provide URLs externally
 * that will be saved, and we wnat to always return the most recent image.
 *
 * @param achievement achievement with organization
 * @returns Fully qualified URL to the achievement image
 */
export function staticImageUrlForAchievement(
	achievement: Achievement & { organization: App.Organization }
): string {
	const imageBaseDomain = `${PUBLIC_HTTP_PROTOCOL}://${achievement.organization.domain}`;
	return `${imageBaseDomain}/achievements/${achievement.id}/image`;
}

/**
 * Only use this within the app and not for providing urls to external services that requrie a full url.
 *
 * @param src: string - the image path or data URI
 */
export function imageUrl(src: string): string {
	return !src || src.startsWith('data:')
		? src
		: `${PUBLIC_MEDIA_DOMAIN}/${src.replace(/^\/+/, '')}`;
}

export function imageExtension(src: string): string {
	return src.startsWith('data:')
		? src.split(';')[0].split('/').slice(-1)[0].split('+')[0]
		: src.split('.').slice(-1)[0];
}
