import { v4 as uuidv4 } from 'uuid';

import type { FullConfig } from '@playwright/test';
import { prisma } from '../../../src/prisma/client.js';

function _populate_process_env(): void {
	// set values in the env that are static and will be used by tests
	process.env.ORG_DOMAIN = `localhost:${process.env.SERVER_PORT}`;
}

export default async function (_config: FullConfig): Promise<() => Promise<void>> {
	_populate_process_env();

	const organization = await prisma.organization.create({
		data: {
			domain: process.env.ORG_DOMAIN,
			name: 'Test Org',
			description: 'An organization for end-to-end testing',
			email: 'noreply@orcapods.dev'
		}
	});

	const achievement = await prisma.achievement.create({
		data: {
			name: 'Claimable Achievment',
			description: 'This achievement can be claimed by unauthenticated users.',
			json: '{}',
			identifier: uuidv4(),
			criteriaNarrative: 'Anybody can claim this, just press the button and follow the steps.',
			organization: { connect: { id: organization.id } },
			achievementConfig: {
				create: { claimable: true, organization: { connect: { id: organization.id } } }
			}
		}
	});

	// Export some values that the tests will want
	process.env.ORG_ID = organization.id;
	process.env.ACHIEVEMENT_ID = achievement.id;

	//return Tear down method
	return async (): Promise<void> => {
		await prisma.achievementClaim.deleteMany({ where: { organizationId: organization.id } });
		await prisma.achievementConfig.deleteMany({ where: { organizationId: organization.id } });
		await prisma.achievement.deleteMany({ where: { organizationId: organization.id } });
		await prisma.organization.delete({ where: { id: organization.id } });
	};
}
