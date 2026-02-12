<script>
	import * as m from '$lib/i18n/messages';
	import { page } from '$app/stores';
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">{$page.status} {m.late_next_eagle_lead()}</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400">{$page?.error?.message}</p>
