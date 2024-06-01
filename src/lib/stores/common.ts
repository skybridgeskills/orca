import { get, type Writable } from 'svelte/store';

export enum LoadingStatus {
	NotStarted,
	Loading,
	Complete,
	Error
}

export const ensureLoaded = async <T>(
	collection: Array<T>,
	fetcher: () => Promise<LoadingStatus>,
	status: Writable<LoadingStatus | Promise<LoadingStatus>>
) => {
	const currentStatus = get(status);
	if (collection.length == 0 && currentStatus == LoadingStatus.NotStarted) {
		const promise = fetcher();
		status.set(promise); // Sets the promise so other components can wait for it too
		status.set(await promise); // Upon resolution will set status to the result
	} else if (currentStatus instanceof Promise) {
		await currentStatus; // If we're already waiting, wait.
	}
};
