import { timingSafeEqual } from 'node:crypto';

import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { EXCHANGE_RETENTION_AFTER_EXPIRY_MS } from '$lib/server/exchange/constants';
import { MESSAGE_RETENTION_MS } from '$lib/server/messaging/constants';

import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';

// Guarded garbage-collection endpoint for messages and expired exchanges. Deletes
// `Message` rows older than the 30-day retention window, and `CredentialExchange` rows
// that expired more than a day ago (kept that long for status display). Responds with
// `{ deleted, exchangesDeleted }`; `deleted` is the message count. Vercel Cron calls it
// daily (the `crons` entry in vercel.json) with `GET` and
// `Authorization: Bearer <CRON_SECRET>`, on the deployment's *.vercel.app host, so
// hooks.server.ts skips the org lookup for /api/cron/*. For manual runs, the secret
// may instead be sent as `x-cron-secret`.
// Always 401 when CRON_SECRET is unset.
function presentedSecret(request: Request): string | null {
	const auth = request.headers.get('authorization');
	const bearer = auth?.match(/^Bearer\s+(.+)$/i)?.[1];
	return bearer ?? request.headers.get('x-cron-secret');
}

function secretMatches(presented: string | null, expected: string): boolean {
	if (!presented) return false;
	const a = Buffer.from(presented);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

async function purge(request: Request): Promise<Response> {
	if (!env.CRON_SECRET || !secretMatches(presentedSecret(request), env.CRON_SECRET)) {
		error(401, 'Unauthorized');
	}

	const now = Date.now();
	const { count: deleted } = await prisma.message.deleteMany({
		where: { createdAt: { lt: new Date(now - MESSAGE_RETENTION_MS) } }
	});
	const { count: exchangesDeleted } = await prisma.credentialExchange.deleteMany({
		where: { expiresAt: { lt: new Date(now - EXCHANGE_RETENTION_AFTER_EXPIRY_MS) } }
	});
	return json({ deleted, exchangesDeleted });
}

export const POST: RequestHandler = ({ request }) => purge(request);
export const GET: RequestHandler = ({ request }) => purge(request);
