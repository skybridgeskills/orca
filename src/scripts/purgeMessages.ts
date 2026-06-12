import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

import { MESSAGE_RETENTION_MS } from '../lib/server/messaging/constants';

dotenv.config();

// Manual / external-scheduler message GC: delete `Message` rows older than the 30-day
// retention window. Mirrors the guarded `/api/cron/purge-messages` endpoint.
//   pnpm exec tsx src/scripts/purgeMessages.ts
const main = async () => {
	const prisma = new PrismaClient();
	try {
		const cutoff = new Date(Date.now() - MESSAGE_RETENTION_MS);
		const { count } = await prisma.message.deleteMany({ where: { createdAt: { lt: cutoff } } });
		console.log(`Purged ${count} message(s) older than ${cutoff.toISOString()}.`);
	} finally {
		await prisma.$disconnect();
	}
};

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
