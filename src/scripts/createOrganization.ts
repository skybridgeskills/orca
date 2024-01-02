import * as dotenv from 'dotenv';
import inquirer from 'inquirer';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const main = () => {
	console.log('Create a new ORCA Organization');
	inquirer
		.prompt([
			{
				name: 'orgName',
				message: 'What should this org be named?',
				default: 'My Organization'
			},
			{
				name: 'orgDescription',
				message: 'Provide a short description.',
				default: 'A social club for example users'
			},
			{
				name: 'orgDomain',
				message: 'What domain will this org access the app on?',
				default: 'localhost'
			},
			{
				name: 'orgEmail',
				message: 'What email address should this org send messages from?',
				default: 'admin@orca.test'
			}
		])
		.then(async (answers) => {
			const prisma = new PrismaClient();
			console.log(answers);
			const newOrg = await prisma.organization.create({
				data: {
					name: answers.orgName,
					description: answers.orgDescription,
					domain: answers.orgDomain,
					email: answers.orgEmail
				}
			});
			console.log(JSON.stringify(newOrg, null, 4));
		});
};

main();
