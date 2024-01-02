<script>
	import { page } from '$app/stores';
</script>

<h1 class="text-xl sm:text-2xl mb-3 dark:text-white">Log In</h1>
<p class="my-4 text-sm text-gray-500 dark:text-gray-400">{$page?.error?.message}</p>

<p class="my-4 text-sm text-gray-500 dark:text-gray-400">
	Return to <a class="font-medium text-blue-600 dark:text-blue-500 hover:underline" href="/login"
		>log in</a
	> again.
</p>
