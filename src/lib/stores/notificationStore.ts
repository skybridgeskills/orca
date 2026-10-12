import { writable } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

interface NotificationAction {
	label: string;
	href: string;
}

/** How long a short confirmation (e.g. "Visibility updated") stays before it goes away. */
export const NOTIFICATION_AUTO_DISMISS_MS = 4000;

export class Notification {
	id: string;
	dismissable: boolean;
	level: App.NotificationLevel;
	message: string;
	actions: NotificationAction[];
	/** When set, the store removes the notification on its own after this many ms. */
	autoDismissMs: number | null;

	constructor(
		message: string,
		dismissable = true,
		level: App.NotificationLevel = 'info',
		actions: NotificationAction[] = [],
		autoDismissMs: number | null = null
	) {
		this.id = uuidv4();
		this.level = level;
		this.message = message;
		this.dismissable = dismissable;
		this.actions = actions;
		this.autoDismissMs = autoDismissMs;
	}
}

const generateNotificationStore = () => {
	const { subscribe, update } = writable<Notification[]>([]);

	return {
		subscribe,
		add: (notification: Notification) => {
			update((n) => [...n, notification]);
			if (notification.autoDismissMs !== null) {
				setTimeout(() => {
					update((n) => n.filter((other) => other.id !== notification.id));
				}, notification.autoDismissMs);
			}
		},
		dismiss: (id: string) => {
			update((n) => n.filter((notification) => notification.id != id || !notification.dismissable));
		}
	};
};

export const notifications = generateNotificationStore();
