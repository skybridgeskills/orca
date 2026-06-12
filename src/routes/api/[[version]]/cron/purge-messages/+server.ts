import { error, json } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { MESSAGE_RETENTION_MS } from '$lib/server/messaging/constants';

import type { RequestHandler } from './$types';

import { env } from '$env/dynamic/private';

// Guarded message garbage-collection endpoint. Deletes `Message` rows older than the
// 30-day retention window. Intended to be called on a schedule (e.g. Vercel Cron)
// with the shared secret in the `x-cron-secret` header:
//
//   vercel.json (not required here):
//   { "crons": [{ "path": "/api/cron/purge-messages", "schedule": "0 3 * * *" }] }
//
// (Vercel Cron sends a GET by default; this endpoint also accepts GET for that
// reason. The secret is required either way.)
async function purge(request: Request): Promise<Response> {
	const secret = request.headers.get('x-cron-secret');
	if (!env.CRON_SECRET || secret !== env.CRON_SECRET) error(401, 'Unauthorized');

	const cutoff = new Date(Date.now() - MESSAGE_RETENTION_MS);
	const { count } = await prisma.message.deleteMany({ where: { createdAt: { lt: cutoff } } });
	return json({ deleted: count });
}

export const POST: RequestHandler = ({ request }) => purge(request);
export const GET: RequestHandler = ({ request }) => purge(request);
