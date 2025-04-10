<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import ImageFileDrop from "$lib/components/ImageFileDrop.svelte";
  import type { ActionData, PageData } from "./$types";
  import { formSchema } from "./schema";
  import type * as yup from "yup";
  import { deserialize, enhance } from "$app/forms";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { imageExtension } from "$lib/utils/imageUrl";
  import type { SubmitFunction } from "@sveltejs/kit";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();

  let formInputData = $state({
    name: data.org.name,
    description: data.org.description,
    url: data.org.url,
    primaryColor: data.org.primaryColor,
    logo: data.org.logo,
    imageExtension: data.org.logo ? imageExtension(data.org.logo) : null,
    tagline: data.org.json?.tagline,
  });
  const noErrors: { [key: string]: string | null } = {
    name: null,
    description: null,
    url: null,
    primaryColor: null,
    logo: null,
    tagline: null,
  };
  let errors = $state({ ...noErrors });

  const validate = () => {
    formSchema
      .validate(formInputData, { abortEarly: false })
      .then(() => {
        errors = { ...noErrors };
      })
      .catch((err: yup.ValidationError) => {
        errors = { ...noErrors };
        console.log(errors);
        err.inner.map((err) => {
          errors[err.path ?? "unknown"] = err.message;
          errors = errors;
        });
      });
  };

  const handleSubmit: SubmitFunction = async ({ formData }) => {
    try {
      const validationResults = await formSchema.validate(formInputData);
    } catch (err) {
      validate();
    }
    const logo = formInputData.logo;
    // see if the form data image is a dataURI, it is this in case of new file or one loaded from DB
    const imageEdited = logo?.startsWith("data:") || (!logo && !!data.org.logo);
    formData.append("imageEdited", `${imageEdited}`);

    return async ({ result }) => {
      if (result.type === "error") {
        errors["name"] = result.error.message ?? "Unknown error";
      }
      if (result.type === "success") {
        if (result.data?.imageUploadUrl && formInputData.logo) {
          // fetch hack, it can fetch a data URI into a blob
          const imageAsBlob = await (await fetch(formInputData.logo)).blob();
          const contentType = `image/${
            formInputData.imageExtension === "png" ? "png" : "svg+xml"
          }`;
          await fetch(result.data.imageUploadUrl, {
            method: "PUT",
            body: imageAsBlob,
            headers: {
              "Content-Type": contentType,
            },
          });
        }
        // Force reload of header once image is updated.
        window.location.replace(`/about`);
      }
      if (result.type === "redirect") {
        goto(result.location);
      }
    };
  };
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{m.org_editCTA()}</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400">
  {m.org_edit_description()}
</p>

<form method="POST" class="max-w-2xl" use:enhance={handleSubmit}>
  <div class="mb-6" class:isError={errors.name}>
    <label
      for="orgEdit_name"
      class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
      >{m.org_name()}</label
    >
    <input
      type="text"
      id="orgEdit_name"
      name="name"
      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      placeholder="My Org"
      bind:value={formInputData.name}
      required
    />
    {#if errors.name}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
        {errors.name}
      </p>{/if}
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
      bind:value={formInputData.description}
></textarea>
    {#if errors.description}<p
        class="mt-2 text-sm text-red-600 dark:text-red-500"
      >
        {errors.description}
      </p>{/if}
  </div>
  <div class="mb-6" class:isError={errors.url}>
    <label
      for="orgEdit_url"
      class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
      >{m.url()}</label
    >
    <input
      type="text"
      id="orgEdit_url"
      name="url"
      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      placeholder="https://example.com"
      bind:value={formInputData.url}
      onblur={validate}
    />
    {#if errors.url}<p class="mt-2 text-sm text-red-600 dark:text-red-500">
        {errors.url}
      </p>{/if}
  </div>

  <div class="mb-6" class:isError={errors.tagline}>
    <label
      for="orgEdit_tagline"
      class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-300"
      >{m.grand_tangy_cheetah_buy()}</label
    >
    <input
      type="text"
      id="orgEdit_tagline"
      name="tagline"
      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
      placeholder={m.moving_east_okapi_shrine()}
      bind:value={formInputData.tagline}
      onblur={validate}
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
      bind:value={formInputData.primaryColor}
      onblur={validate}
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
        class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-400"
        >{m.image()}</label
      >
      <ImageFileDrop
        bind:currentValue={formInputData.logo}
        bind:errorMessage={errors["logo"]}
        bind:imageExtension={formInputData.imageExtension}
      />
      <input
        type="hidden"
        name="imageExtension"
        bind:value={formInputData.imageExtension}
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
