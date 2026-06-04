<script lang="ts">
	import { Carta, CartaEditor } from 'carta-md';
	import sanitizeHtml from 'sanitize-html';

	import * as m from '$lib/i18n/messages';

	import 'carta-md/default.css';
	import './markdown-editor.css';

	interface Props {
		value: string;
		inputName?: string;
		disabled?: boolean;
	}

	let { value = $bindable(''), inputName, disabled = false }: Props = $props();

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
		writeTab: m.firm_clear_fox_write(),
		previewTab: m.sharp_quiet_panther_preview()
	};
</script>

<div
	onclick={(e) => {
		e.stopPropagation();
		e.preventDefault();
	}}
	onkeypress={(e) => {
		e.stopPropagation();
	}}
	role="none"
	class:opacity-50={disabled}
	class:pointer-events-none={disabled}
>
	<CartaEditor {carta} userLabels={labels} bind:value theme="default" mode="tabs" />
	{#if inputName}
		<input type="hidden" bind:value name={inputName} />
	{/if}
</div>
