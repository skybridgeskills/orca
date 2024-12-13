import eslintPluginSvelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';
import * as typescriptParser from '@typescript-eslint/parser';

export default [
	...eslintPluginSvelte.configs['flat/recommended'],
	{
		ignores: [
			'.DS_Store',
			'.env',
			'.env.*',
			'!.env.example',
			'.svelte-kit/**/*',
			'node_modules/**/*',
			'package-lock.json',
			'pnpm-lock.yaml',
			'src/lib/i18n/**/*.js',
			'yarn.lock'
		]
	},
	{
		languageOptions: {
			parserOptions: {
				svelteConfig,
				parser: typescriptParser,
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte']
			}
		}
	}
];
