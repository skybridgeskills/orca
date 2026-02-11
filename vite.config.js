import { sveltekit } from '@sveltejs/kit/vite';
import { nodeLoaderPlugin } from '@vavite/node-loader/plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { paraglide } from '@inlang/paraglide-js-adapter-vite';
import * as dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Plugin to fix SvelteKit-generated tsconfig.json with deprecated TypeScript options
const fixTsconfig = () => {
	const tsconfigPath = path.resolve('.svelte-kit/tsconfig.json');
	if (fs.existsSync(tsconfigPath)) {
		try {
			const config = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
			if (config.compilerOptions) {
				config.compilerOptions.verbatimModuleSyntax = true;
				delete config.compilerOptions.importsNotUsedAsValues;
				delete config.compilerOptions.preserveValueImports;
				fs.writeFileSync(tsconfigPath, JSON.stringify(config, null, '\t') + '\n');
			}
		} catch (e) {
			// Ignore errors
		}
	}
};

const fixTsconfigPlugin = () => ({
	name: 'fix-tsconfig',
	buildStart() {
		fixTsconfig();
	},
	configureServer() {
		// Also fix on dev server start
		fixTsconfig();
	}
});

export default defineConfig(({ mode }) => {
	let plugins = [
		sveltekit(),
		fixTsconfigPlugin(),
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
		plugins,
		server: {
			port: 5173,
			host: '0.0.0.0',
			allowedHosts: true
		}
	};
});
