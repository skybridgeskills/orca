<script lang="ts">
	let klass = 'bg-slate-100 text-slate-700';
	export { klass as class };
</script>

<span class={`whitespace-nowrap rounded-lg py-0.5 px-2 text-xs font-semibold leading-6 ${klass}`}>
	<slot />
</span>
