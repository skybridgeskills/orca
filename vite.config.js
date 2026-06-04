import fs from 'fs';
import { fileURLToPath } from 'node:url';
import path from 'path';

import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { nodeLoaderPlugin } from '@vavite/node-loader/plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { playwright } from '@vitest/browser-playwright';
import * as dotenv from 'dotenv';
import { defineConfig } from 'vitest/config';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
		} catch {
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
		tailwindcss(),
		sveltekit(),
		fixTsconfigPlugin(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/i18n',
			strategy: ['cookie', 'baseLocale']
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
			projects: [
				// Existing node-based unit tests (run via `pnpm test:unit`). Keep the
				// include globs and node environment exactly as before.
				{
					extends: true,
					test: {
						name: 'unit',
						environment: 'node',
						include: [
							'**/tests/vitest/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
							'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'
						]
					}
				},
				// Headless-browser Storybook story smoke tests (run via
				// `pnpm test:storybook`). Modeled on skills-verifier/vite.config.ts.
				{
					extends: true,
					plugins: [
						// The plugin will run tests for the stories defined in your Storybook config
						// See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
						storybookTest({
							configDir: path.join(__dirname, '.storybook')
						})
					],
					test: {
						name: 'storybook',
						testTimeout: 60000,
						browser: {
							enabled: true,
							headless: true,
							provider: playwright(),
							instances: [
								{
									browser: 'chromium'
								}
							]
						},
						setupFiles: ['.storybook/vitest.setup.ts']
					}
				}
			]
		},
		plugins,
		server: {
			port: parseInt(process.env.SERVER_PORT || process.env.PORT || '5173'),
			host: '0.0.0.0',
			allowedHosts: true
		}
	};
});
