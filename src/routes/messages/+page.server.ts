import { redirect } from '@sveltejs/kit';

import { prisma } from '$lib/../prisma/client';
import { calculatePageAndSize } from '$lib/utils/pagination';

import type { PageServerLoad } from './$types';

// Inbox: the recipient's reading context. This is a NORMAL org-scoped query — a user
// sees only their own messages in the org they are currently signed into. Superadmins
// see their cross-org report messages here because those `Message.organizationId`
// equal the superadmin org id (the reading context), even though the underlying report
// belongs to another origin org. No un-scoped reads happen on the inbox.
export const load: PageServerLoad = async ({ url, locals }) => {
	const me = locals.session?.user?.id;
	if (!me) redirect(302, '/');

	const { page, pageSize } = calculatePageAndSize(url);

	const where = { userId: me, organizationId: locals.org.id };

	const [messages, count] = await Promise.all([
		prisma.message.findMany({
			where,
			orderBy: { createdAt: 'desc' },
			include: { report: true },
			skip: (page - 1) * pageSize,
			take: pageSize
		}),
		prisma.message.count({ where })
	]);

	// Project to a minimal, safe row view-model. We deliberately do NOT expose
	// reporter identity here (the inbox never needs it); only the report's target
	// type + reason are surfaced as a short descriptor.
	const rows = messages.map((msg) => ({
		id: msg.id,
		type: msg.type,
		createdAt: msg.createdAt,
		report: msg.report
			? {
					targetType: msg.report.targetType,
					reason: msg.report.reason
				}
			: null
	}));

	return { messages: rows, count, page, pageSize };
};
