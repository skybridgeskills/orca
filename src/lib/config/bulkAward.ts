import { env } from '$env/dynamic/public';

const DEFAULT_BULK_AWARD_REQUEST_INTERVAL_MS = 500;

export function getBulkAwardRequestIntervalMs(): number {
	const parsed = Number(env.PUBLIC_BULK_AWARD_REQUEST_INTERVAL_MS);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_BULK_AWARD_REQUEST_INTERVAL_MS;
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForBulkAwardRequestInterval(): Promise<void> {
	await sleep(getBulkAwardRequestIntervalMs());
}
