// credential-handler-polyfill ships no type declarations. This covers only the
// surface ORCA uses through `$lib/chapi` (a non-global `load()`).
declare module 'credential-handler-polyfill' {
	export interface WebCredentialOptions {
		recommendedHandlerOrigins?: string[];
		protocols?: Record<string, string>;
	}

	export class WebCredential {
		constructor(dataType: string, data: unknown, options?: WebCredentialOptions);
		readonly type: 'web';
		readonly dataType: string;
		readonly data: unknown;
		readonly options: Required<WebCredentialOptions>;
	}

	export interface CredentialsContainerPolyfill {
		get(options: { web: Record<string, unknown> }): Promise<WebCredential | null>;
		store(credential: WebCredential): Promise<WebCredential | null>;
	}

	export interface Polyfill {
		credentials: CredentialsContainerPolyfill;
		WebCredential: typeof WebCredential;
	}

	export function load(
		options: { setGlobal?: boolean; mediatorOrigin: string } | string
	): Promise<Polyfill>;
}
