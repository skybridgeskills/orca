import type { Prisma } from '@prisma/client';

// Notification preferences live in `User.json` (`App.UserConfig`). Email defaults to
// ON when unset; only an explicit `false` disables it.

function asObject(json: Prisma.JsonValue | null | undefined): Prisma.JsonObject {
	return json && typeof json === 'object' && !Array.isArray(json)
		? (json as Prisma.JsonObject)
		: {};
}

export function emailNotificationsEnabled(userJson: Prisma.JsonValue | null | undefined): boolean {
	const notifications = asObject(asObject(userJson).notifications);
	return notifications.email !== false; // default true unless explicitly false
}

// Returns the merged json to persist, preserving any other keys.
export function setEmailNotifications(
	userJson: Prisma.JsonValue | null | undefined,
	enabled: boolean
): Prisma.JsonObject {
	const base = { ...asObject(userJson) };
	base.notifications = { ...asObject(base.notifications), email: enabled };
	return base;
}
