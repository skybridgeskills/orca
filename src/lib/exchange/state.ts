// Client-safe: shared by the status endpoint and the Send to wallet modal.

/** VCALM exchange states, as the DCC transaction service reports them. */
export type ExchangeState = 'pending' | 'active' | 'complete' | 'invalid';
export type ExchangeError = { code: string; message: string };
export type ExchangeStatus = {
	state: ExchangeState;
	expiresAt: string | null;
	errors?: ExchangeError[];
};

/** State is derived from timestamps and errors, never stored (plan D11). */
export function deriveExchangeState(row: {
	completedAt: Date | null;
	startedAt: Date | null;
	errors: unknown;
}): ExchangeState {
	if (row.completedAt) return 'complete';
	if (Array.isArray(row.errors) && row.errors.length > 0) return 'invalid';
	if (row.startedAt) return 'active';
	return 'pending';
}

/** No further change is possible: stop checking. Expiry is judged from `expiresAt`. */
export const isTerminal = (state: ExchangeState) => state === 'complete' || state === 'invalid';
