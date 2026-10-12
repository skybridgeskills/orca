import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
	stories: ['../src/lib/components/**/*.stories.@(js|ts|svelte)'],
	addons: [
		'@storybook/addon-svelte-csf',
		'@storybook/addon-a11y',
		'@storybook/addon-docs',
		'@storybook/addon-vitest',
		'@storybook/addon-themes'
	],
	framework: {
		name: '@storybook/sveltekit',
		options: {}
	},
	async viteFinal(viteConfig) {
		const { mergeConfig } = await import('vite');
		// @storybook/sveltekit does not mock `$app/paths`; alias it to a local
		// mock so components that call `resolve()` render in Storybook.
		return mergeConfig(viteConfig, {
			resolve: {
				alias: {
					'$app/paths': fileURLToPath(new URL('./mocks/app-paths.ts', import.meta.url))
				}
			}
		});
	}
};

export default config;
