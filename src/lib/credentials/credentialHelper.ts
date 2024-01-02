import type { Prisma } from '@prisma/client';
import type { AchievementCredential } from '@prisma/client';
import { env } from '$env/dynamic/private';

const DEFAULT_CACHE_TIMEOUT = parseInt(env.CREDENTIAL_CACHE_TIMEOUT ?? '600000');

export const isCredentialCacheExired = (credential: AchievementCredential) => {
	const previousJson = (credential.json as Prisma.JsonObject) ?? {};
	const proof = (previousJson?.proof as { created: string }) ?? {};
	const previousDate = proof.created ? Date.parse(proof.created) : undefined;
	return !previousDate || previousDate + DEFAULT_CACHE_TIMEOUT < Date.now();
};
