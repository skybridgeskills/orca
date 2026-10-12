import type { Identifier } from '@prisma/client';

import { prisma } from '$lib/../prisma/client';

// Helpers for reading/writing passkey credentials stored as PASSKEY-type `Identifier`
// rows (`identifier` = credentialId; credential material in `Identifier.json`).

export interface StoredPasskey {
	identifierId: string;
	credentialId: string;
	userId: string;
	credential: App.PasskeyCredential;
}

function toStored(row: Identifier): StoredPasskey {
	return {
		identifierId: row.id,
		credentialId: row.identifier,
		userId: row.userId,
		credential: row.json as App.PasskeyCredential
	};
}

/** All of a user's passkeys in an org. */
export async function getUserPasskeys(
	userId: string,
	organizationId: string
): Promise<StoredPasskey[]> {
	const rows = await prisma.identifier.findMany({
		where: { userId, organizationId, type: 'PASSKEY' }
	});
	return rows.map(toStored);
}

/** Look up a single passkey by its credentialId within an org (auth lookup). */
export async function findPasskeyByCredentialId(
	organizationId: string,
	credentialId: string
): Promise<StoredPasskey | null> {
	const row = await prisma.identifier.findFirst({
		where: { organizationId, type: 'PASSKEY', identifier: credentialId }
	});
	return row ? toStored(row) : null;
}

/** Whether the user has at least one passkey in the org (drives the superadmin 2FA rule). */
export async function userHasPasskey(userId: string, organizationId: string): Promise<boolean> {
	const count = await prisma.identifier.count({
		where: { userId, organizationId, type: 'PASSKEY' }
	});
	return count > 0;
}

/** Persist an updated signature counter (+ lastUsedAt) after a successful assertion. */
export async function updatePasskeyCounter(
	identifierId: string,
	credential: App.PasskeyCredential,
	newCounter: number
): Promise<void> {
	await prisma.identifier.update({
		where: { id: identifierId },
		data: {
			json: { ...credential, counter: newCounter, lastUsedAt: new Date().toISOString() }
		}
	});
}
