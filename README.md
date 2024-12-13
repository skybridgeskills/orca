# ORCA: Open Recognition Community App

Understanding and building community through recognition. This tool facilitates the award of [Open Badges 3.0](https://imsglobal.github.io/openbadges-specification/ob_v3p0.html) [Verifiable Credentials](https://www.w3.org/TR/vc-data-model/). The app prioritizes doing badges together within a community, instead of the institutional focus of much prior work in the space.

Features:

- Open Badges 3.0 and 2.0 support
- Self claiming
- Prerequisite requirements
- Peer endorsements, and qualified reviews by users who hold configurable reviewer badge
- Internationalization (i18n) with supported locales `en-US`, `en-AU`, and `fr`.
- Digital credentials wallet integration with CHAPI.

Roadmap:

- API (based on [VC-API](https://w3c-ccg.github.io/vc-api/)) that can be used by connected services that cause badges to be awarded or make use of those badges on behalf of the community.
- Federation of communities for non-PII aggregate usage data using ActivityPub
- Visualizations: word clouds, and maps
- Enhanced granular privacy controls
- OID4VC wallet integrations
- Badge import and community decision-making for scalable credential consumption.
- Badge-Based Access Control (BBAC): Increase the number and type of actions gated by holding a relevant valid badge beyond existing prerequisite-qualified-claim and qualified-review capabilities.

This is pre-release software. It is not complete, but it is ready for collaboration with partners in the open recognition community. Major changes and potential breaking database migrations will likely occur before initial public release.

ORCA is produced by [Skybridge Skills](https://skybridgeskills.com) in partnership with [Reconnâitre](https://reconnaitre.openrecognition.org/).

## Running for Local Development

Instructions have been developed and tested on MacOS. A development environment on another OS may vary slightly.

Prerequisites:

- NodeJS (`lts/hydrogen` v18.x), NPM
- A Postgres database which can be run locally on one of 2 ways:
  - Install PostgreSQL ([How to](https://www.moncefbelyamani.com/how-to-install-postgresql-on-a-mac-with-homebrew-and-lunchy/) install PostgreSQL on a Mac with Homebrew)
  - Install Docker (https://www.docker.com/products/docker-desktop/) and use the provided docker compose

Optional, but helpful enhancements:

- [map \*.test wildcard domains to localhost with dnsmasq](https://khanhicetea.com/til/2018-04-24-setup-wildcard-domains-test-for-development-in-macos/)
- VS Code with plugins:
  - [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode)
  - [Playwright Test](https://marketplace.visualstudio.com/items?itemName=ms-playwright.playwright)
  - [Prisma](https://marketplace.visualstudio.com/items?itemName=Prisma.prisma)
  - [Vitest](https://marketplace.visualstudio.com/items?itemName=ZixuanChen.vitest-explorer)

Install dependencies with `npm install`.

Create a database, schema, and an app-specific database user with a password.

- Using a locally installed PostgreSQL server:
  - `psql`
  - Create user: `CREATE ROLE orcaadmin WITH LOGIN PASSWORD 'password';`
  - Grant privileges: `ALTER ROLE orcaadmin WITH SUPERUSER;`
  - Create database: `CREATE DATABASE orca;`
  - Connect to database: `\c orca` or launch straight to this database at the command prompt: `psql -d orca`
  - Create a schema to hold relevant tables: `CREATE SCHEMA orca_public AUTHORIZATION orcaadmin;`
  - _Optional for E2E test support:_ Create a schema to hold the test tables: `CREATE SCHEMA orca_test AUTHORIZATION orcaadmin;`
- Using the provided docker compose file:
  - `docker compose up -d`

Customize Environment file with `.env`. Initialize your environment file by copying the example `cp .env.example .env`.

- Populate `DATABASE_URL`.
- Ensure that `PUBLIC_HTTP_PROTOCOL="http"` or `="https"` to ensure absolute URLs are properly generated.

Migrate database: `npm run migrate:dev`

Create your organization: `npm run createOrganization`. Select an org domain like `localhost:5173` where the app will run. Do not include `http://` in the domain field. This should match `DEFAULT_ORG_DOMAIN` in your `.env` file.

Create your admin: `npm run createAdmin`.

Create your keypair for the org: `npm run createKeypair`.

Start a development server: `npm run dev`. This will start up a webserver at `http://localhost:5173`. If you did the wildcard domain setup, it is also available at `http://orca.test:5173`. You may auto-open the app in a new browser tab with: `npm run dev -- --open`

## Media Storage

Media is designed to be stored in an S3-compatible bucket for production use and then served to the public via a CloudFront distribution.

For local development there are two options:

1. Save files to the local file system in the `dev-uploads` directory. (Preferred)
2. Use localstack to emulate S3. This is only preferred when testing or developing against the S3 apis.

### Switching between local filesystem and localstack and vice-versa

To ensure you get image continuity when switching between localstack and the filesystem media storage you can sync the directories between the 2. Just be sure so copy everything out of localstack to the `dev-uploads` directory before shutting it down. e.g. localstack -> dev-media `aws --endpoint-url=http://localhost:4566 s3 cp --include='*' --recursive s3://orca-media/ dev-uploads/`

### Media saved to the local filesystem (preferred)

Set the `PUBLIC_MEDIA_DOMAIN` in your `.env` file to the value `"/media"` e.g. `PUBLIC_MEDIA_DOMAIN="/media"`

That is it, all media files will be saved to your local file system in the `dev-uploads` folder and served via the vite dev server.

### Using localstack to emulate S3

You can use localstack to provide a local S3 interface using `docker compose --profile localstack up -d`. Then you can initialize the S3 buckets with `npm run createS3BucketLocalStack` (function is not exactly idempotent, but is safe to call multiple times in effect) **There are a few caveats to using localstack though, read below!**

When bringing down the stack remember to specify the profile e.g. `docker compose --profile localstack down`

By default no media will be persisted. To persist data you will either need to be a pro member and can edit the docker compose file to uncomment out the persistence line and your api key **OR** you can use the community pod loading feature described at https://docs.localstack.cloud/user-guide/tools/cloud-pods/community/.

The local pod stuff can be summarized as follows:

- Install the localstack CLI: https://docs.localstack.cloud/getting-started/installation/#localstack-cli
- To save a state: `localstack pod save file:///Users/<my_username>/Desktop/awesome-pod`
- To load a state: `localstack pod load file:///Users/<my_username>/Desktop/awesome-pod`

### Debugging server side code

Debugging server side code is possible via `vavite/node-loader` as described in this article: https://www.codelantis.com/blog/sveltekit-server-debugging-vscode-webstorm.

It uses the npm script target `debug-dev`. The launch configuration for this in VSCode is "Debug via NPM" and should be selected from the Run and Debug menu.

This code (and the dev dependency on vavite/node-loader) should be removed once the requisite SvelteKit and vite features to allow attaching a debugger are added and we can update our dependencies to use these updated versions.

Important to note this approach likely leaks memory so feel free to stop and restart the process as often as you see fit.

## Building for production

To create a production version of ORCA, use: `npm run build`. You can preview the production build with `npm run preview`.

> To deploy the app, you may need to install an [adapter](https://kit.svelte.dev/docs/adapters) for your target environment. The app is not suitable for `adapter-static`, as significant logic needs to run server-side, for security.

## Documenting Dependency Types

The `types` directory in this repository contains some test versions of type definition files for dependencies not yet submitted to DefinitelyTyped. These were generated with a command like `npx -p typescript tsc node_modules/jsonld-signatures/**/*.js --declaration --allowJs --emitDeclarationOnly --module system --moduleResolution node --outFile ./types/jsonldsignatures/index.d.ts` and then customized to fix the wrong module names that had been generated. See how to [test declaration files](https://github.com/DefinitelyTyped/DefinitelyTyped#testing) before submission to DefinitelyTyped.

It may be possible to discover a way to more directly dynamically generate these in the future, so that they don't need to be checked into this repo, but some customization might be helpful, so this might be a fine place to test them.
