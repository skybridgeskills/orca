import * as m from '$lib/i18n/messages';
import * as path from 'path';
import * as fs from 'fs/promises';
import mime from 'mime-types';
import { error, json } from '@sveltejs/kit';
import type { RequestEvent } from './$types';
import { isLocalDevFileMedia } from '$lib/server/media.js';

export const GET = async ({ params }: RequestEvent) => {
	if (!isLocalDevFileMedia())
		throw error(500, { message: m.media_localMediaOnlyAvailableInDevError() });
	const filePath = path.join(process.cwd(), 'dev-uploads', params.id, params.filename);

	try {
		const mimeType = mime.lookup(filePath);
		if (!mimeType) throw error(404);

		const data = await fs.readFile(filePath);
		return new Response(data, {
			headers: { 'Content-type': mimeType }
		});
	} catch (err) {
		if (err instanceof Error) {
			console.error(err);
			throw error(500, { message: err.message });
		}
		throw err;
	}
};

export const PUT = async ({ params, request }: RequestEvent) => {
	if (!isLocalDevFileMedia())
		throw error(500, { message: m.media_localMediaOnlyAvailableInDevError() });
	try {
		const dirPath = path.join(process.cwd(), 'dev-uploads', params.id);
		const filePath = path.join(dirPath, params.filename);
		try {
			await fs.mkdir(dirPath, { recursive: false });
		} catch (err) {
			if ('EEXIST' !== (err as any).code) throw err;
		}

		const requestBody = await request.arrayBuffer();
		await fs.writeFile(filePath, Buffer.from(requestBody), { flag: 'w' });
		return json({ path: filePath });
	} catch (err) {
		if (err instanceof Error) {
			console.error(err);
			throw error(500, { message: err.message });
		}
		throw err;
	}
};
