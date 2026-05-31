<script lang="ts" module>
	import { defineMeta } from '@storybook/addon-svelte-csf';

	import Modal from './Modal.svelte';

	const { Story } = defineMeta({
		title: 'components/Modal',
		component: Modal,
		tags: ['autodocs']
	});
</script>

<Story name="Default">
	<Modal id="story-modal-default" visible title="Confirm action" onclose={() => {}}>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			This is the modal body. The default action row renders a single Close button.
		</p>
	</Modal>
</Story>

<Story name="Multiple actions">
	<Modal
		id="story-modal-actions"
		visible
		title="Delete badge"
		onclose={() => {}}
		actions={[
			{ label: 'Cancel', submodule: 'secondary', buttonType: 'button', onClick: () => {} },
			{ label: 'Delete', submodule: 'danger', buttonType: 'button', onClick: () => {} }
		]}
	>
		<p class="text-sm text-gray-600 dark:text-gray-400">
			Are you sure you want to delete this badge? This cannot be undone.
		</p>
	</Modal>
</Story>

<Story name="No actions">
	<Modal id="story-modal-no-actions" visible title="Information" onclose={() => {}} actions={[]}>
		<p class="text-sm text-gray-600 dark:text-gray-400">A modal with no footer action buttons.</p>
	</Modal>
</Story>
