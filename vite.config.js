import { sveltekit } from '@sveltejs/kit/vite';
import { nodeLoaderPlugin } from '@vavite/node-loader/plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig(({ mode }) => {
	let plugins = [
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/i18n',
			strategy: ['cookie', 'baseLocale']
		}),
		sveltekit()
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
		server: {
			allowedHosts: true
		},
		plugins
	};
});
