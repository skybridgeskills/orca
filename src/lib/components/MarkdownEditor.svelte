<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import sanitizeHtml from 'sanitize-html';

	import { Carta, CartaEditor } from 'carta-md';
	import 'carta-md/light.css';
	// import 'carta-md/dark.css';
	import { preferredTheme } from '$lib/stores/interfacePrefsStore';

	export let value: string;
	export let inputName: string | undefined;
	export let disabled: boolean = false;

	const carta = new Carta({
		sanitizer: (dirty?: string): string => {
			if (!dirty) return '';

			return sanitizeHtml(dirty, {
				allowedTags: [
					'ol',
					'code',
					'del',
					'p',
					'ul',
					'li',
					'a',
					'b',
					'strong',
					'pre',
					'em',
					'i',
					'h1',
					'h2',
					'h3',
					'h4',
					'h5',
					'h6'
				],
				allowedAttributes: { a: ['href'] }
			});
		},
		disableIcons: ['taskList']
	});
	const labels = {
		writeTab: m.writeCTA(),
		previewTab: m.previewCTA()
	};
</script>

<div
	on:click|stopPropagation|preventDefault
	on:keypress|stopPropagation
	role="none"
	class:opacity-50={disabled}
	class:pointer-events-none={disabled}
>
	<CartaEditor {carta} {labels} bind:value theme="default" mode="tabs" />
	{#if inputName}
		<input type="hidden" bind:value name={inputName} />
	{/if}
</div>

<style lang="postcss" global>
	.carta-theme__default {
		--border-color: #b9b9b9;
		--selection-color: #b5f0ff3d;
		--focus-outline: #76bbf3;
		--hover-color: #e9e9e9;
	}

	.carta-theme__default.carta-editor {
		border: 1px solid var(--border-color);
		border-radius: 4px;
	}

	.carta-theme__default .carta-editor ::selection {
		background: var(--selection-color);
	}

	/* Box sizings */
	.carta-theme__default .carta-toolbar {
		border-bottom: 1px solid var(--border-color);
	}

	.carta-theme__default .carta-wrapper {
		padding: 0;
	}

	.carta-theme__default .carta-container > * {
		margin: 1rem 0 1rem 0;
	}

	/* Text settings */
	.carta-theme__default .carta-input {
		caret-color: #4d4d4c;
		font-size: 0.95rem;
	}

	/* Splitter */
	.carta-theme__default .mode-split.carta-container:after {
		content: '';
		position: absolute;
		top: 0;
		bottom: 0;
		left: 50%;
		width: 1px;
		background: var(--border-color);
	}

	.carta-theme__default .mode-split .carta-input {
		padding-right: 1rem;
	}

	.carta-theme__default .mode-split .carta-renderer {
		padding-left: 1rem;
	}

	/* Toolbar */
	.carta-theme__default .carta-toolbar {
		padding: 0 12px;
	}

	.carta-theme__default .carta-toolbar-left {
		display: flex;
		align-items: flex-end;
	}

	/* Markdown input and renderer */
	.carta-theme__default .carta-input,
	.carta-theme__default .carta-renderer {
		height: 320px;
		overflow-y: scroll;
		margin: 0;
		padding: 1rem;
	}

	/* Icons */
	.carta-theme__default .carta-icon {
		border: 0;
		background: transparent;
	}

	.carta-theme__default .carta-icon:hover {
		background: var(--hover-color);
	}

	.carta-input > pre {
		background: inherit;
	}

	/* Buttons */
	.carta-theme__default .carta-toolbar-left button {
		background: none;
		border: none;
		font-size: 0.9rem;
		padding: 4px 1rem;
		border-bottom: 2px solid transparent;
		margin-right: 12px;
		cursor: pointer;
	}

	.carta-theme__default .carta-toolbar-left button:last-child {
		margin-right: 0;
	}

	.carta-theme__default .carta-toolbar-left button.carta-active {
		font-weight: 600;
		border-bottom: 2px solid var(--hover-color);
	}

	/* .carta-theme__dark {
		$background: #0d1117;
		$background-light: #161b22;
		$border: #2b3138;
		$accent: #1f6feb;
	} */
	#app-wrapper .carta-input {
		background-color: rgb(249 250 251 / var(--tw-bg-opacity));
	}
	#app-wrapper.dark .carta-renderer {
		background-color: rgb(17 24 39 / var(--tw-bg-opacity));
	}
	#app-wrapper.dark .carta-editor {
		border: 1px solid #2b3138;
		border-radius: 0.5rem;
	}
	#app-wrapper.dark .carta-input {
		background-color: rgb(55 65 81 / var(--tw-bg-opacity));
	}
	#app-wrapper.dark .carta:focus-within {
		outline: 2px solid #1f6feb;
	}

	#app-wrapper.dark .carta-wrapper {
		color: #ccc;
		flex-grow: 1;
		overflow-y: auto;
	}
	#app-wrapper.dark .carta-wrapper.carta-container {
		min-height: 120px;
		max-height: 160px;
	}

	#app-wrapper.dark .carta-font-code {
		font-family: 'Fira Code', monospace;
		caret-color: white;
	}

	#app-wrapper.dark .carta-toolbar {
		height: 2.5rem;

		background-color: #161b22;
		border-bottom: 1px solid #2b3138;

		padding-right: 12px;
		border-top-left-radius: 0.5rem;
		border-top-right-radius: 0.5rem;
	}
	#app-wrapper.dark .carta-icon {
		width: 2rem;
		height: 2rem;
	}
	#app-wrapper.dark .carta-icon:hover {
		color: white;
		background-color: #2b3138;
	}

	#app-wrapper.dark .carta-toolbar {
		color: #ccc;
	}

	#app-wrapper.dark .carta-toolbar-left > *:first-child {
		border-top-left-radius: 0.5rem;
	}

	#app-wrapper.dark .carta-toolbar-left > * {
		font-size: 0.95rem;
	}

	#app-wrapper.dark .carta-active {
		height: 100%;
		background-color: #0d1117;
		transform: translateY(1px);
		color: white;

		border-right: 1px solid #2b3138;
		border-bottom: 1px solid #0d1117;
	}
	#app-wrapper.dark .carta-active:not(:first-child) {
		border-left: 1px solid #2b3138;
	}

	#app-wrapper.dark [class*='shj-lang-'] {
		background: transparent;
	}
</style>
