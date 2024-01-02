import { sveltekit } from '@sveltejs/kit/vite';
import { nodeLoaderPlugin } from '@vavite/node-loader/plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-js-adapter-vite';
import * as dotenv from 'dotenv';

dotenv.config();

/** @type {import('vite').UserConfig} */
export default defineConfig(({ mode }) => {
	let plugins = [
		sveltekit(),
		paraglide({
			project: './project.inlang',
			outdir: './src/lib/i18n'
		})
	];
	if (mode === 'debug-dev') {
		plugins = [nodeLoaderPlugin(), ...plugins];
	}
	if (process.env.PUBLIC_HTTP_PROTOCOL === 'https' && process.env.PUBLIC_DEV_SSL === 'true')
		plugins = [basicSsl(), ...plugins];

	return {
		build: {
			sourcemap: true
		},
		css: {
			devSourcemap: true
		},
		test: {
			include: ['**/tests/vitest/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']
		},
		plugins
	};
});
