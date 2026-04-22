/**
 * Strip server-only secrets from `org` before the object is sent to the client.
 * This is the only place that should remove keys from `org.json` for client-bound
 * payloads — any load function that returns `org` (or nested `json`) to the browser
 * must use this helper (or a path derived from its result).
 */
export function sanitizeOrganizationForClient(org: App.Organization): App.SanitizedOrganization {
	const { json: jsonRaw, ...rest } = { ...org };
	const json = jsonRaw as App.OrganizationConfig;

	if (!json.transactionService) {
		return {
			...rest,
			json: cloneSanitizedJson(json)
		};
	}

	const { encryptedApiKey, ...transactionServiceRest } = { ...json.transactionService };

	return {
		...rest,
		json: {
			...cloneSanitizedJson(json),
			transactionService: {
				...transactionServiceRest,
				apiKeyConfigured: Boolean(encryptedApiKey)
			}
		}
	};
}

/** Shallow-clone org JSON for client output (`JsonObject` is not spreadable in TS). */
function cloneSanitizedJson(config: App.OrganizationConfig): App.SanitizedOrganizationConfig {
	return { ...(config as Record<string, unknown>) } as App.SanitizedOrganizationConfig;
}
