declare module 'svelte-droplet' {
	import type { SvelteComponent } from 'svelte';

	export interface FileDropProps {
		handleFiles: (files: File[]) => void;
		max?: number;
		[key: string]: unknown;
	}

	export class FileDrop extends SvelteComponent<FileDropProps> {}
}
