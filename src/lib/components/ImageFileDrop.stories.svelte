<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import { StoryPreview } from '$lib/storybook';

	import ImageFileDrop from './ImageFileDrop.svelte';

	const { Story } = defineMeta({
		title: 'components/ImageFileDrop',
		component: ImageFileDrop
	});

	// Local data-URI SVG so the showcase has no network dependency.
	const sampleImage =
		'data:image/svg+xml;utf8,' +
		encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">` +
				`<rect width="200" height="200" rx="16" fill="#1d4ed8"/>` +
				`<circle cx="100" cy="76" r="32" fill="#bfdbfe"/>` +
				`<rect x="46" y="120" width="108" height="22" rx="11" fill="#bfdbfe"/>` +
				`<text x="100" y="172" font-family="sans-serif" font-size="18" fill="#eff6ff" text-anchor="middle">Sample</text>` +
				`</svg>`
		);
</script>

<Story name="Empty" asChild>
	<StoryPreview>
		<div class="max-w-xl">
			<ImageFileDrop currentValue={null} imageExtension={null} />
		</div>
	</StoryPreview>
</Story>

<Story name="With image" asChild>
	<StoryPreview>
		<div class="max-w-xl">
			<ImageFileDrop currentValue={sampleImage} imageExtension="svg" />
		</div>
	</StoryPreview>
</Story>
