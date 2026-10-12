import * as fs from 'fs/promises';
import * as path from 'path';

import { error, json } from '@sveltejs/kit';
import mime from 'mime-types';

import * as m from '$lib/i18n/messages';
import { isLocalDevFileMedia } from '$lib/server/media.js';

import type { RequestEvent } from './$types';

export const GET = async ({ params }: RequestEvent) => {
	if (!isLocalDevFileMedia()) error(500, { message: m.clear_mellow_goat_lead() });
	const filePath = path.join(process.cwd(), 'dev-uploads', params.id, params.filename);

	try {
		const mimeType = mime.lookup(filePath);
		if (!mimeType) error(404);

		const data = await fs.readFile(filePath);
		return new Response(new Uint8Array(data), {
			headers: { 'Content-type': mimeType }
		});
	} catch (err) {
		if (err instanceof Error) {
			console.error(err);
			error(500, { message: err.message });
		}
		throw err;
	}
};

export const PUT = async ({ params, request }: RequestEvent) => {
	if (!isLocalDevFileMedia()) error(500, { message: m.clear_mellow_goat_lead() });
	try {
		const dirPath = path.join(process.cwd(), 'dev-uploads', params.id);
		const filePath = path.join(dirPath, params.filename);
		try {
			await fs.mkdir(dirPath, { recursive: false });
		} catch (err) {
			if ('EEXIST' !== (err as any).code) throw err;
		}

		const requestBody = await request.arrayBuffer();
		await fs.writeFile(filePath, new Uint8Array(requestBody), { flag: 'w' });
		return json({ path: filePath });
	} catch (err) {
		if (err instanceof Error) {
			console.error(err);
			error(500, { message: err.message });
		}
		throw err;
	}
};
