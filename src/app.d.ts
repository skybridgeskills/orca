/// <reference types="@sveltejs/kit" />

// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types

declare namespace App {
	// Models
	interface UserData {
		id: string;
		givenName: string?;
		familyName: string?;
		organizationId: string;
		orgRole: string?;
		identifiers: import('@prisma/client').Identifier[];
		defaultVisibility: import('@prisma/client').Visibility;
	}

	interface SessionData {
		id: string;
		user: UserData?;
		expiresAt: Date;
		valid: boolean;
	}

	type OrganizationConfig = import('@prisma/client').Prisma.JsonObject & {
		tagline?: string;
		permissions?: {
			editAchievementCapability?: {
				requiresAchievement: string | null;
			};
		};
	};
	type Organization = import('@prisma/client').Organization & {
		json: OrganizationConfig;
	};

	interface Locals {
		theme: string;
		org: Organization;
		token: string;
		session: SessionData?;
		locale: import('$lib/i18n/runtime').AvailableLanguageTag;
	}
	interface PageData {
		org: Organization;
	}
	interface Error {
		message: string;
		code?: string;
	}
	interface EvidenceItem {
		id?: string;
		narrative?: string;
	}

	interface AchievementConfigWithJson {
		json?: {
			capabilities: {
				inviteRequires: string | null;
			};
			claimTemplate: string;
		}?;
	}

	// Design System
	type ButtonRole = 'primary' | 'secondary' | 'danger';
	type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

	interface Evidence {
		id?: string;
		name?: string;
		narrative?: string;
	}
	// Credentials stuff
	interface OpenBadgeCredential {
		'@context': string[];
		id: string;
		type: string[];
		proof?: {
			type: string;
			created: string;
			proofPurpose: string;
			proofValue: string;
			verificationMethod: string;
		};
		credentialSubject: {
			id: string;
			type: string;
			identifier?: Array<{
				salt: string;
				identityHash: string;
				identityType: string;
				hashed: boolean;
				type: string;
			}>;
			achievement: {
				id: string;
				type: string;
				name: string;
				description: string;
				criteria: {
					narrative?: string;
					id?: string;
				};
				image?: string;
			};
		};
		issuanceDate: string;
		issuer: {
			id: string;
			type: string;
			name: string;
			email: string;
			description: string;
		};
		evidence?: Evidence[];
	}
}

/**
 * It's possible to tell SvelteKit how to type objects inside your app by declaring the `App` namespace. By default, a new project will have a file called `src/app.d.ts` containing the following:
 *
 * ```ts
 * /// <reference types="@sveltejs/kit" />
 *
 * declare namespace App {
 * 	interface Locals {}
 *
 * 	interface PageData {}
 *
 * 	interface Platform {}
 * }
 * ```
 *
 * By populating these interfaces, you will gain type safety when using `event.locals`, `event.platform`, and `data` from `load` functions.
 *
 * Note that since it's an ambient declaration file, you have to be careful when using `import` statements. Once you add an `import`
 * at the top level, the declaration file is no longer considered ambient and you lose access to these typings in other files.
 * To avoid this, either use the `import(...)` function:
 *
 * ```ts
 * interface Locals {
 * 	user: import('$lib/types').User;
 * }
 * ```
 * Or wrap the namespace with `declare global`:
 * ```ts
 * import { User } from '$lib/types';
 *
 * declare global {
 * 	namespace App {
 * 		interface Locals {
 * 			user: User;
 * 		}
 * 		// ...
 * 	}
 * }
 * ```
 *
 */
