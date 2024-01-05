import { PrismaClient, Prisma } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import type { DefaultArgs } from '@prisma/client/runtime/library';

const serverlessContext = process.env.DATABASE_SERVERLESS == 'true';
export let prisma: PrismaClient<Prisma.PrismaClientOptions, never, DefaultArgs>;

if (serverlessContext) {
	neonConfig.webSocketConstructor = ws;
	const connectionString = `${process.env.DATABASE_URL}`;
	const pool = new Pool({ connectionString });
	const adapter = new PrismaNeon(pool);
	prisma = new PrismaClient({ adapter });
} else {
	prisma = new PrismaClient();
}
