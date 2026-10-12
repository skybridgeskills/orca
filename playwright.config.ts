import path from 'path';

import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

// Two run modes (see tests/playwright/support/domain.ts and ADR
// docs/adr/2026-06-06-cross-environment-e2e-architecture.md):
//   - local (default): boot the dev server via webServer, address orgs on
//     unique *.localhost hosts, DB from .env.test (orca_test).
//   - remote (E2E_TARGET=remote, E2E_BASE_URL=https://<host>): no local server;
//     run the same suite against an external deployment. The caller/CI supplies
//     E2E_BASE_URL and DATABASE_URL (pointed at that deployment's DB); we do not
//     load .env.test so it can't clobber them.
const isRemote = process.env.E2E_TARGET === 'remote';
const remoteBaseURL = process.env.E2E_BASE_URL;
if (isRemote && !remoteBaseURL) {
	throw new Error('E2E_TARGET=remote requires E2E_BASE_URL to be set.');
}

if (!isRemote) {
	dotenv.config({ path: path.resolve(process.env.CI ? '.env.test.ci' : '.env.test') });
}

const baseURL = isRemote ? remoteBaseURL : `http://test.test:${process.env.SERVER_PORT || 5173}`;

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
	testDir: './tests/playwright',
	globalSetup: './tests/playwright/globals/setup',
	/* Maximum time one test can run for. */
	timeout: 30 * 1000,
	expect: {
		/**
		 * Maximum time expect() should wait for the condition to be met.
		 * For example in `await expect(locator).toHaveText();`
		 */
		timeout: 5000
	},
	/* Run tests in files in parallel */
	fullyParallel: true,
	/* Fail the build on CI if you accidentally left test.only in the source code. */
	forbidOnly: !!process.env.CI,
	/* Retry on CI only */
	retries: process.env.CI ? 2 : 0,
	/* Opt out of parallel tests on CI. */
	workers: process.env.CI ? 1 : undefined,
	/* Reporter to use. See https://playwright.dev/docs/test-reporters */
	reporter: 'html',
	/* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
	use: {
		/* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
		actionTimeout: 0,
		/* Base URL to use in actions like `await page.goto('/')`. */
		baseURL,

		/* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
		trace: 'on-first-retry'
	},

	/* Configure projects for major browsers */
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}

		// {
		// 	name: 'firefox',
		// 	use: { ...devices['Desktop Firefox'] }
		// },

		// {
		// 	name: 'webkit',
		// 	use: { ...devices['Desktop Safari'] }
		// }

		/* Test against mobile viewports. */
		// {
		//   name: 'Mobile Chrome',
		//   use: { ...devices['Pixel 5'] },
		// },
		// {
		//   name: 'Mobile Safari',
		//   use: { ...devices['iPhone 12'] },
		// },

		/* Test against branded browsers. */
		// {
		//   name: 'Microsoft Edge',
		//   use: { channel: 'msedge' },
		// },
		// {
		//   name: 'Google Chrome',
		//   use: { channel: 'chrome' },
		// },
	],

	/* Folder for test artifacts such as screenshots, videos, traces, etc. */
	// outputDir: 'test-results/',

	/* Run your local dev server before starting the tests. In remote mode the
	   deployment is already running, so no local server is started. */
	...(isRemote
		? {}
		: {
				webServer: {
					command: `pnpm exec dotenv -e .env.test -- bash tests/playwright/start-server.sh`,
					port: parseInt(process.env.SERVER_PORT!),
					timeout: 120000, // Increase timeout to 2 minutes
					reuseExistingServer: !process.env.CI
				}
			})
});
