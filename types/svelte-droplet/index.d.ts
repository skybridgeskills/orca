declare module 'svelte-droplet' {
	import type { SvelteComponent } from 'svelte';

	export interface FileDropProps {
		handleFiles: (files: File[]) => void;
		max?: number;
		[key: string]: any;
	}

	export class FileDrop extends SvelteComponent<FileDropProps> {}
}
