import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import { PrismaClient } from '@prisma/client';

type OrgChoice = {
	id: string;
	name: string;
	value: string;
};

dotenv.config();

const main = async () => {
	const prisma = new PrismaClient();

	const selectAnOrg = async (skipRecords = 0): Promise<OrgChoice> => {
		let organizations = await prisma.organization.findMany({
			take: 9,
			skip: skipRecords,
			select: {
				name: true,
				id: true
			}
		});
		let nextOrgs = await prisma.organization.findMany({
			take: 9,
			skip: skipRecords + 9,
			select: {
				name: true,
				id: true
			}
		});
		let choices: Array<OrgChoice> = [];
		organizations.map((org, i) => {
			let thisOrg = {
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

	let selectedOrganization = await selectAnOrg();
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
