<script lang="ts">
	import * as m from '$lib/i18n/messages';
	import ImageFileDrop from '$lib/components/ImageFileDrop.svelte';
	import type { ActionData, PageData } from './$types';
	import { formSchema } from './schema';
	import type * as yup from 'yup';
	import { deserialize } from '$app/forms';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { imageExtension } from '$lib/utils/imageUrl';

	export let form: ActionData;
	export let data: PageData;

	let formData = {
		name: data.org.name,
		description: data.org.description,
		url: data.org.url,
		primaryColor: data.org.primaryColor,
		logo: data.org.logo,
		imageExtension: data.org.logo ? imageExtension(data.org.logo) : null,
		tagline: data.org.json?.tagline
	};
	const noErrors: { [key: string]: string | null } = {
		name: null,
		description: null,
		url: null,
		primaryColor: null,
		logo: null,
		tagline: null
	};
	let errors = { ...noErrors };

	const validate = () => {
		formSchema
			.validate(formData, { abortEarly: false })
			.then(() => {
				errors = { ...noErrors };
			})
			.catch((err: yup.ValidationError) => {
				errors = { ...noErrors };
				console.log(errors);
				err.inner.map((err) => {
					errors[err.path] = err.message;
					errors = errors;
				});
			});
	};

	const handleSubmit = async (e: SubmitEvent) => {
		try {
			const validationResults = await formSchema.validate(formData);
		} catch (err) {
			validate();
		}
		const formsData = new FormData(e.target as HTMLFormElement);

		// see if the form data image is a dataURI, it is this in case of new file or one loaded from DB
		const imageEdited =
			`${formData.logo}`.startsWith('data:') || (!formData.logo && !!data.org.logo);
		formsData.append('imageEdited', `${imageEdited}`);

		if (formData['imageExtension']) formsData.append('imageExtension', formData.imageExtension);

		const response = await fetch($page.url, { method: 'POST', body: formsData });
		const result = deserialize(await response.text());
		switch (result.type) {
			case 'failure':
			// fall through to success block
			case 'success':
				//read the upload url and put the image data to it.
				if (formData['logo'] && result.data?.imageUploadUrl) {
					const imageAsBlob = await (await fetch(formData['logo'])).blob();
					const contentType = `image/${formData['imageExtension'] === 'png' ? 'png' : 'svg+xml'}`;
					await fetch(result.data.imageUploadUrl, {
						method: 'PUT',
						body: imageAsBlob,
						headers: {
							'Content-Type': contentType
						}
					});
				}
				window.location.replace(`/about`); // force page reload so header gets updated
				break;
			case 'redirect':
				goto(result.location);
				break;
			case 'error':
				console.error(result.error);
		}
		if (response.status == 400) {
			errors['name'] = result.status?.toString() || 'Unknown error';
		}
	};
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.org_editCTA()}</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400">
	{m.org_edit_description()}
</p>

<form method="POST" class="max-w-2xl" on:submit|preventDefault|stopPropagation={handleSubmit}>
	<div class="mb-6" class:isError={errors.name}>
		<label
			for="orgEdit_name"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">{m.org_name()}</label
		>
		<input
			type="text"
			id="orgEdit_name"
			name="name"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="My Org"
			bind:value={formData.name}
			required
		/>
		{#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.name}</p>{/if}
	</div>
	<div class="mb-6" class:isError={errors.description}>
		<label
			for="orgEdit_description"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
			>{m.description()}</label
		>
		<textarea
			id="orgEdit_description"
			name="description"
			rows="4"
			class="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="What makes this community special is..."
			bind:value={formData.description}
		/>
		{#if errors.description}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errors.description}
			</p>{/if}
	</div>
	<div class="mb-6" class:isError={errors.url}>
		<label for="orgEdit_url" class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.url()}</label
		>
		<input
			type="text"
			id="orgEdit_url"
			name="url"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder="https://example.com"
			bind:value={formData.url}
			on:blur={validate}
		/>
		{#if errors.url}<p class="mt-2 text-sm text-red-600 dark:text-red-500">{errors.url}</p>{/if}
	</div>

	<div class="mb-6" class:isError={errors.tagline}>
		<label
			for="orgEdit_tagline"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300">Tagline</label
		>
		<input
			type="text"
			id="orgEdit_tagline"
			name="tagline"
			class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
			placeholder={m.moving_east_okapi_shine()}
			bind:value={formData.tagline}
			on:blur={validate}
		/>
		{#if errors.tagline}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errors.tagline}
			</p>{/if}
	</div>

	<div class="mb-6" class:isError={errors.primaryColor}>
		<label
			for="orgEdit_primaryColor"
			class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
			>{m.org_primaryColor()}</label
		>
		<input
			type="color"
			id="orgEdit_url"
			name="primaryColor"
			class=""
			bind:value={formData.primaryColor}
			on:blur={validate}
		/>
		{#if errors.primaryColor}
			<p class="mt-2 text-sm text-red-600 dark:text-red-500">
				{errors.primaryColor}
			</p>
		{/if}
	</div>

	<!-- Image -->
	<div class="sm:w-5/12">
		<div class:isError={errors.logo}>
			<label
				for="achievementEdit_image"
				class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400">{m.image()}</label
			>
			<ImageFileDrop
				bind:currentValue={formData.logo}
				bind:errorMessage={errors['logo']}
				bind:imageExtension={formData.imageExtension}
			/>
			{#if errors.logo}
				<p class="mt-2 text-sm text-red-600 dark:text-red-500">
					{errors.logo}
				</p>{/if}
		</div>
	</div>

	<div class="flex items-center lg:order-2">
		<button
			type="submit"
			class="mr-3 text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
			>{m.submitCTA()}</button
		>
		<a
			href="/about"
			class="text-gray-800 dark:text-white hover:bg-gray-50 focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-4 lg:px-5 py-2 lg:py-2.5 mr-2 dark:hover:bg-gray-700 focus:outline-none dark:focus:ring-gray-800"
			>{m.cancelCTA()}</a
		>
	</div>
</form>

<style lang="postcss">
	.isError label {
		@apply text-red-700;
	}
	.dark .isError label {
		@apply text-red-500;
	}

	.isError input {
		@apply bg-red-50 border-red-500 text-red-900 placeholder-red-700;
	}
	.isError input:focus {
		@apply border-red-500;
	}
	.dark .isError input {
		@apply bg-red-100 border-red-400;
	}
</style>
