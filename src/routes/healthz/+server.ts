import { json } from '@sveltejs/kit';
import { prisma } from '../../prisma/client';

export const GET = async () => {
	try {
		// Verify database connectivity with a lightweight query
		await prisma.$queryRaw`SELECT 1`;
		return json({ healthy: true });
	} catch {
		// Database is not reachable - return 503 Service Unavailable
		return json({ healthy: false }, { status: 503 });
	}
};
