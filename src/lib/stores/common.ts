import { get, type Writable } from 'svelte/store';

export enum LoadingStatus {
	NotStarted,
	Loading,
	Complete,
	Error
}

export const ensureLoaded = async <T>(
	collection: Array<T>,
	fetcher: () => Promise<void>,
	status: LoadingStatus
) => {
	console.log('ensureLoaded', collection.length, status);
	if (collection.length == 0 && status == LoadingStatus.NotStarted) await fetcher();
};
