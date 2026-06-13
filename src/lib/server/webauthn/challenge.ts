import { prisma } from '$lib/../prisma/client';

// The WebAuthn challenge is persisted on the `Session` row between issuing options and
// verifying the response. It is single-use (cleared on consume) and short-lived. This
// closes the replay hole the old PR left open. The challenge is never read from client
// input — only from the session row bound to the request cookie.

export const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** Store a fresh challenge (+ expiry) on a session row. */
export async function issueChallenge(sessionId: string, challenge: string): Promise<void> {
	await prisma.session.update({
		where: { id: sessionId },
		data: {
			passkeyChallenge: challenge,
			passkeyChallengeExpiresAt: new Date(Date.now() + PASSKEY_CHALLENGE_TTL_MS)
		}
	});
}

/**
 * Return the session's challenge iff present and unexpired, and CLEAR it (single-use).
 * Returns null when missing/expired — callers must treat null as a verification failure.
 */
export async function consumeChallenge(session: {
	id: string;
	passkeyChallenge: string | null;
	passkeyChallengeExpiresAt: Date | null;
}): Promise<string | null> {
	const { passkeyChallenge, passkeyChallengeExpiresAt } = session;
	// Always clear, even on failure, so a stale/used challenge can't be retried.
	if (passkeyChallenge) {
		await prisma.session.update({
			where: { id: session.id },
			data: { passkeyChallenge: null, passkeyChallengeExpiresAt: null }
		});
	}
	if (!passkeyChallenge || !passkeyChallengeExpiresAt) return null;
	if (passkeyChallengeExpiresAt.getTime() < Date.now()) return null;
	return passkeyChallenge;
}
