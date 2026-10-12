<script lang="ts">
	import Button from './Button.svelte';

	interface Props {
		class?: string;
		text?: string;
		sourceUrl?: string;
		fileName?: string | null;
		id?: string;
		buttonType?: 'button' | 'submit';
		moreProps?: object;
		submodule?: App.ButtonRole;
	}

	let {
		class: klass = '',
		text = '',
		sourceUrl = '',
		fileName = null,
		id = '',
		buttonType = 'button',
		moreProps = {},
		submodule = 'primary'
	}: Props = $props();

	let errorMessage = $state('');

	const download = async () => {
		errorMessage = '';
		const response = await fetch(sourceUrl, { method: 'POST', body: '' });

		// A refusal (e.g. 403 for suspended content) must not be saved as the file.
		if (!response.ok) {
			const body = await response.json().catch(() => null);
			errorMessage = body?.message || response.statusText || String(response.status);
			return;
		}

		const responseBlob = await response.blob();
		const href = URL.createObjectURL(responseBlob);
		const aTag = document.createElement('a');
		aTag.href = href;
		aTag.download = fileName || 'download.json'; // TODO: extract extension from response header content type

		document.body.appendChild(aTag);
		aTag.click();
		document.body.removeChild(aTag);
	};
</script>

<Button {id} {buttonType} {submodule} {...moreProps} onclick={download} class={klass}>{text}</Button
>
{#if errorMessage}
	<p class="mt-2 text-sm text-red-600 dark:text-red-500" role="alert">{errorMessage}</p>
{/if}
