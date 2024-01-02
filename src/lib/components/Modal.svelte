<script lang="ts">
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import Button from '$lib/components/Button.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let visible = false;
	export let id = 'modalDialog';
	export let title = 'Modal Dialog';
	let element: HTMLElement | null;

	const handleClose = () => {
		dispatch('close');
	};

	interface Action {
		label: string;
		submodule?: App.ButtonRole;
		buttonType?: 'button' | 'submit';
		onClick: (() => void) | ((e: MouseEvent | KeyboardEvent) => void);
	}
	export let actions: Action[] = [
		{
			label: 'Close',
			buttonType: 'button',
			submodule: 'primary',
			onClick: handleClose
		}
	];

	onMount(() => {
		element = document.getElementById(id);
		element?.addEventListener('transitionend', (e) => {
			if (element && visible) element.focus();
		});
	});
</script>

<div
	{id}
	tabindex="-1"
	aria-hidden={!visible}
	class:hidden={!visible}
	class:visible
	transition:fade
	class="modaldialog fixed top-0 left-0 right-0 z-50 w-full p-4 overflow-x-hidden overflow-y-auto inset-0 h-modal h-full bg-black bg-opacity-80"
>
	<div class="relative w-full h-full max-w-2xl mx-auto">
		<div class="relative bg-white dark:bg-gray-900 rounded-lg shadow">
			<!-- Modal header -->
			<div class="flex items-start justify-between p-4 border-b rounded-t">
				<slot name="heading"
					><h4 class="text-xl sm:text-2xl text-gray-800 dark:text-white !mt-0">{title}</h4></slot
				>
				<button
					on:click={handleClose}
					type="button"
					class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
					data-modal-toggle="defaultModal"
				>
					<svg
						aria-hidden="true"
						class="w-5 h-5"
						fill="currentColor"
						viewBox="0 0 20 20"
						xmlns="http://www.w3.org/2000/svg"
						><path
							fill-rule="evenodd"
							d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
							clip-rule="evenodd"
						/></svg
					>
					<span class="sr-only">Close modal</span>
				</button>
			</div>
			<!-- Modal body -->
			<div class="p-6 space-y-6">
				<slot />
			</div>
			<!-- Modal footer -->
			<div class="flex flex-row justify-end p-6 space-x-2 border-t border-gray-200 rounded-b">
				{#each actions as action}
					<Button
						submodule={action.submodule}
						buttonType={action.buttonType}
						onClick={action.onClick}>{action.label}</Button
					>
				{/each}
			</div>
		</div>
	</div>
</div>

<style>
	.modaldialog {
		background-color: rgba(0, 0, 0, 0.8);
	}
	.modaldialog.visible:not(:focus-within) {
		background-color: rgba(0, 0, 1, 0.8);
		transition: background-color 0.01s;
	}
</style>
