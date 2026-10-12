// Host/domain helpers for the critical-path suite.
//
// ORCA resolves the org from the request Host (src/hooks.server.ts), so every
// run must address an org through a host whose `domain` it controls.
//
// Local mode (M1): synthesize a unique `crit-<label>.localhost:<port>` host per
// spec. Vite dev runs with `allowedHosts: true`, so any `*.localhost` reaches
// the dev server, and cookies key to the host WITHOUT the port.
//
// Remote mode (M2 wires this up via E2E_BASE_URL): a single org per run,
// addressed by the deployment host itself; the label is not used.

const DEFAULT_LOCAL_PORT = '5150';

export interface OrgAddress {
	/** Value stored as Organization.domain and used to resolve the org by Host. */
	domain: string;
	/** Host without the port — used as the cookie `domain`. */
	host: string;
	/** Full origin for page/request navigation. */
	origin: string;
}

export function resolveOrgHost(baseURL: string | undefined, label: string): OrgAddress {
	if (baseURL) {
		const url = new URL(baseURL);
		return { domain: url.host, host: url.hostname, origin: url.origin };
	}

	const port = process.env.SERVER_PORT || DEFAULT_LOCAL_PORT;
	const host = `crit-${label}.localhost`;
	const domain = `${host}:${port}`;
	return { domain, host, origin: `http://${domain}` };
}
