export function isExchangeAvailable(org: App.Organization): boolean {
	const config = readOrgJson(org);
	if (!config) return false;
	const ts = config.transactionService;
	if (ts === null || typeof ts !== 'object' || Array.isArray(ts)) {
		return false;
	}
	const o = ts as Record<string, unknown>;
	return (
		isNonEmptyString(o.url) &&
		isNonEmptyString(o.tenantName) &&
		isNonEmptyString(o.encryptedApiKey)
	);
}

export function isExchangeEnabled(org: App.Organization): boolean {
	const config = readOrgJson(org);
	if (config?.issuer?.type !== 'transactionService') {
		return false;
	}
	return isExchangeAvailable(org);
}

function readOrgJson(org: App.Organization): App.OrganizationConfig | null {
	const j = org.json as unknown;
	if (j === null || typeof j !== 'object' || Array.isArray(j)) {
		return null;
	}
	return j as App.OrganizationConfig;
}

function isNonEmptyString(v: unknown): v is string {
	return typeof v === 'string' && v.length > 0;
}
