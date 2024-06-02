import { get, type Writable } from 'svelte/store';

export enum LoadingStatus {
	NotStarted,
	Loading,
	Complete,
	Error
}

export const ensureLoaded = async (
	statusStore: Writable<LoadingStatus>,
	fetcher?: () => Promise<LoadingStatus>
) => {
	const currentStatus = get(statusStore);
	if (currentStatus == LoadingStatus.Complete) return;

	if (currentStatus == LoadingStatus.NotStarted && fetcher !== undefined) {
		// Sets the promise so other components can wait for it too
		statusStore.set(LoadingStatus.Loading);
		statusStore.set(await fetcher()); // Upon resolution will set status to the result
	} else if (fetcher == undefined && currentStatus == LoadingStatus.Loading) {
		await new Promise<LoadingStatus>((resolve) => {
			const unsubscribe = statusStore.subscribe((status) => {
				if (status !== LoadingStatus.Loading) {
					unsubscribe();
					resolve(status);
				}
			});
		});
	}
};
