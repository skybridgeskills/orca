import { writable, get } from 'svelte/store';
import { v4 as uuidv4 } from 'uuid';

interface NotificationAction {
	label: string;
	href: string;
}

export class Notification {
	id: string;
	dismissable: boolean;
	level: App.NotificationLevel;
	message: string;
	actions: NotificationAction[];

	constructor(
		message: string,
		dismissable = true,
		level: App.NotificationLevel = 'info',
		actions: NotificationAction[] = []
	) {
		this.id = uuidv4();
		this.level = level;
		this.message = message;
		this.dismissable = dismissable;
		this.actions = actions;
	}
}

const generateNotificationStore = () => {
	const { subscribe, set, update } = writable<Notification[]>([]);

	return {
		subscribe,
		add: (notification: Notification) => {
			update((n) => [...n, notification]);
		},
		dismiss: (id: string) => {
			update((n) => n.filter((notification) => notification.id != id || !notification.dismissable));
		}
	};
};

export const notifications = generateNotificationStore();
