<script lang="ts">
	import Button from './Button.svelte';

	export let text: string = '';
	export let sourceUrl: string = '';
	export let fileName: string | null = null;

	let klass = '';
	export { klass as class };
	export let id: string = '';
	export let buttonType: 'button' | 'submit' = 'button';
	export let moreProps: Object = {};
	export let submodule: App.ButtonRole = 'primary';

	const download = async () => {
		const response = await fetch(sourceUrl, { method: 'POST', body: '' });

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

<Button {id} {buttonType} {submodule} {...moreProps} onClick={download} class={klass}>{text}</Button
>
