<script lang="ts">
  import * as m from "$lib/i18n/messages";
  import type { ActionData, PageData } from "./$types";
  import { achievementFormSchema } from "$lib/data/achievementForm";
  import AchievementForm from "$lib/partials/AchievementForm.svelte";
  import Heading from "$lib/components/Heading.svelte";

  export let data: PageData;
  const categories = data.categories;

  let formData = {
    name: "",
    description: "",
    criteriaId: "",
    criteriaNarrative: "",
    category: "uncategorized",
  };
</script>

<Heading
  title={m.achievement_createNewHeading()}
  description={m.achievement_createNewDescription()}
  level="h1"
/>

<AchievementForm initialData={formData} {categories} />
