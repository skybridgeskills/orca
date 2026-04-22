import nodeAdapter from '@sveltejs/adapter-node';
import vercelAdapter from '@sveltejs/adapter-vercel';
import preprocess from 'svelte-preprocess';

// Vercel auto-injects VERCEL=1; every other build context (Docker,
// local, GH Actions) falls through to adapter-node.
// adapter-vercel only auto-maps Node 16/18/20; set runtime so `VERCEL=1` works on Node 22.
const adapter = process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs20.x' }) : nodeAdapter();

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: { adapter },
	preprocess: preprocess({ sourceMap: true })
};

export default config;
