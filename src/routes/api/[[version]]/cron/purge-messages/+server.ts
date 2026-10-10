import { timingSafeEqual } from 'node:crypto';

import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { MESSAGE_RETENTION_MS } from '$lib/server/messaging/constants';

import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';

// Guarded message garbage-collection endpoint. Deletes `Message` rows older than the
// 30-day retention window. Vercel Cron calls it daily (the `crons` entry in
// vercel.json) with `GET` and `Authorization: Bearer <CRON_SECRET>`, on the
// deployment's *.vercel.app host, so hooks.server.ts skips the org lookup for
// /api/cron/*. For manual runs, the secret may instead be sent as `x-cron-secret`.
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

	const cutoff = new Date(Date.now() - MESSAGE_RETENTION_MS);
	const { count } = await prisma.message.deleteMany({ where: { createdAt: { lt: cutoff } } });
	return json({ deleted: count });
}

export const POST: RequestHandler = ({ request }) => purge(request);
export const GET: RequestHandler = ({ request }) => purge(request);
