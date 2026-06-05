import { Ed25519VerificationKey } from '@interop/ed25519-verification-key';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';

dotenv.config();

const main = async () => {
	const prisma = new PrismaClient();

	const selectAnOrg = async (skipRecords = 0) => {
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
		let choices = [];
		organizations.map((org) => {
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

	console.log(`Generating a new key for this organization...`);
	const keyPair = await Ed25519VerificationKey.generate();
	if (!keyPair.privateKeyMultibase) {
		throw new Error('Generated key pair is missing a private key.');
	}

	console.log(keyPair.publicKeyMultibase);

	await prisma.signingKey.create({
		data: {
			organization: { connect: { id: selectedOrganization.id } },
			publicKeyMultibase: keyPair.publicKeyMultibase,
			privateKeyMultibase: keyPair.privateKeyMultibase
		}
	});
};

main();
