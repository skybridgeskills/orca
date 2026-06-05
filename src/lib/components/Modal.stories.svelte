<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import { fn } from 'storybook/test';

	import { StoryPreview } from '$lib/storybook';

	import Modal from './Modal.svelte';

	const { Story } = defineMeta({
		title: 'components/Modal',
		component: Modal
	});

	const onclose = fn().mockName('onclose');
	const onCancel = fn().mockName('cancel');
	const onDelete = fn().mockName('delete');
</script>

<!--
	Modal uses fixed top-0 left-0 inset-0 z-50 positioning, so it overlays the whole
	viewport rather than staying contained within a StoryPreview panel. Per the phase
	guidance we therefore drop the responsive widths={[480, 768]} and just render
	light + dark. Because both panels overlay the same fixed area, only the topmost
	(last-rendered) variant is visible at a time; toggle the theme toolbar / inspect
	to see each.
-->

<Story name="Default" asChild>
	<StoryPreview>
		<Modal id="story-modal-default" visible title="Confirm action" {onclose}>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				This is the modal body. The default action row renders a single Close button.
			</p>
		</Modal>
	</StoryPreview>
</Story>

<Story name="Multiple actions" asChild>
	<StoryPreview>
		<Modal
			id="story-modal-actions"
			visible
			title="Delete badge"
			{onclose}
			actions={[
				{ label: 'Cancel', submodule: 'secondary', buttonType: 'button', onClick: onCancel },
				{ label: 'Delete', submodule: 'danger', buttonType: 'button', onClick: onDelete }
			]}
		>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Are you sure you want to delete this badge? This cannot be undone.
			</p>
		</Modal>
	</StoryPreview>
</Story>

<Story name="No actions" asChild>
	<StoryPreview>
		<Modal id="story-modal-no-actions" visible title="Information" {onclose} actions={[]}>
			<p class="text-sm text-gray-600 dark:text-gray-400">A modal with no footer action buttons.</p>
		</Modal>
	</StoryPreview>
</Story>
