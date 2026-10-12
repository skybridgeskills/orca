import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Vercel auto-injects VERCEL=1; every other build context (Docker,
// local, GH Actions) falls through to adapter-node.
// adapter-vercel does not infer Node 24 from project settings alone; set the
// runtime explicitly so the `VERCEL=1` path targets nodejs24.x.
const adapter = process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs24.x' }) : nodeAdapter();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: { adapter },
	preprocess: vitePreprocess()
};

export default config;
