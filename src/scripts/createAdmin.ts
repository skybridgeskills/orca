import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';

type OrgChoice = {
	id: string;
	name: string;
	value: string;
};

dotenv.config();

// Create (or promote) a GENERAL_ADMIN user in a chosen org.
//
// Org selection (first match wins):
//   1. `--org <id>` / `--org-id <id>` CLI flag (or `--org=<id>`).
//   2. `SUPERADMIN_ORG_ID` env var (set in your .env) — convenient for provisioning a
//      superadmin into the dedicated superadmin org without an interactive prompt.
//   3. Otherwise fall back to the interactive org picker (the default behaviour).
//
// Usage examples:
//   pnpm tsx src/scripts/createAdmin.ts                 # interactive org picker
//   pnpm tsx src/scripts/createAdmin.ts --org <orgId>   # target a specific org
//   SUPERADMIN_ORG_ID=<orgId> pnpm tsx src/scripts/createAdmin.ts  # superadmin org
const orgIdFromArgs = (): string | null => {
	const argv = process.argv.slice(2);
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--org' || arg === '--org-id') return argv[i + 1] ?? null;
		const match = /^--org(?:-id)?=(.+)$/.exec(arg);
		if (match) return match[1];
	}
	return null;
};

const main = async () => {
	const prisma = new PrismaClient();

	const selectAnOrg = async (skipRecords = 0): Promise<OrgChoice> => {
		const organizations = await prisma.organization.findMany({
			take: 9,
			skip: skipRecords,
			select: {
				name: true,
				id: true
			}
		});
		const nextOrgs = await prisma.organization.findMany({
			take: 9,
			skip: skipRecords + 9,
			select: {
				name: true,
				id: true
			}
		});
		const choices: Array<OrgChoice> = [];
		organizations.map((org) => {
			const thisOrg = {
				...org,
				value: org.id
			};

			choices.push(thisOrg);
		});
		if (nextOrgs.length)
			choices.push({
				name: 'NONE OF THESE. SELECT NEXT SET.',
				id: 'NONE',
				value: 'NONE'
			});

		const userChoice = await inquirer.prompt([
			{
				name: 'organization',
				message: 'Select which organization to use',
				type: 'list',
				default: 0,
				choices: choices
			}
		]);

		if (userChoice.organization == 'NONE') return selectAnOrg(skipRecords + 9);

		return choices.find((x) => x.value == userChoice.organization) || choices[0];
	};

	// Resolve a directly-specified org (CLI flag or SUPERADMIN_ORG_ID) before falling
	// back to the interactive picker.
	const directOrgId = (orgIdFromArgs() ?? process.env.SUPERADMIN_ORG_ID?.trim()) || null;

	let selectedOrganization: OrgChoice;
	if (directOrgId) {
		const org = await prisma.organization.findUnique({
			where: { id: directOrgId },
			select: { id: true, name: true }
		});
		if (!org) {
			console.error(`No organization found with id ${directOrgId}.`);
			await prisma.$disconnect();
			process.exit(1);
		}
		selectedOrganization = { ...org, value: org.id };
	} else {
		selectedOrganization = await selectAnOrg();
	}
	console.log(`You selected ${selectedOrganization.name} (${selectedOrganization.id})!`);

	console.log(`Create an admin user for organization `);
	const userData = await inquirer.prompt([
		{
			name: 'givenName',
			message: "What is the user's given name?",
			type: 'string',
			default: 'John'
		},
		{
			name: 'familyName',
			message: "What is the user's family name?",
			type: 'string',
			default: 'Doe'
		},
		{
			name: 'email',
			message: "What is the user's email?",
			type: 'string',
			default: 'john@example.com'
		}
	]);

	const existingUser = await prisma.identifier.findFirst({
		where: {
			organizationId: selectedOrganization.id,
			identifier: userData.email
		}
	});
	if (existingUser) {
		const updatedUser = await prisma.user.update({
			where: {
				id: existingUser.userId
			},
			data: {
				orgRole: 'GENERAL_ADMIN'
			}
		});
		console.log('Existing user updated:');
		console.log(updatedUser);
	} else {
		const newUser = await prisma.user.create({
			data: {
				givenName: userData.givenName,
				familyName: userData.familyName,
				organization: { connect: { id: selectedOrganization.id } },
				orgRole: 'GENERAL_ADMIN',
				identifiers: {
					create: {
						type: 'EMAIL',
						identifier: userData.email,
						verifiedAt: new Date(Date.now()).toISOString(),
						organization: { connect: { id: selectedOrganization.id } }
					}
				}
			}
		});
		console.log(newUser);
	}
};

main();
