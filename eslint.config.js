import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

import svelteConfig from './svelte.config.js';

export default ts.config(
	// Mirrors the previous .eslintignore so the lint scope is unchanged by the
	// flat-config migration.
	{
		ignores: [
			'.DS_Store',
			'**/node_modules/**',
			'build/**',
			// eslint 8 implicitly ignored dot-directories; flat config (eslint 9)
			// does not, so list the build/output dot-dirs explicitly to keep the
			// lint scope equivalent to the previous baseline.
			'.svelte-kit/**',
			'.vercel/**',
			'src/lib/i18n/messages/**',
			'storybook-static/**',
			'package/**',
			'dev-uploads/**',
			'.env',
			'.env.*',
			'!.env.example',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock'
		]
	},
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs.recommended,
	prettier,
	...svelte.configs.prettier,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node },
			ecmaVersion: 2020,
			sourceType: 'module'
		},
		rules: {
			// typescript-eslint recommends not using no-undef on TS projects.
			// https://typescript-eslint.io/troubleshooting/faqs/eslint/#i-get-errors-from-the-no-undef-rule
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				parser: ts.parser,
				extraFileExtensions: ['.svelte'],
				svelteConfig
			}
		}
	},
	// CommonJS scripts use require()
	{
		files: ['scripts/**/*.cjs'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off'
		}
	},
	// Ambient .d.ts stubs mirror CJS require() for module augmentation
	{
		files: ['types/**/*.d.ts'],
		rules: {
			'@typescript-eslint/no-require-imports': 'off'
		}
	}
);
