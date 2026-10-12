import { describe, expect, test } from 'vitest';

import { verifyPkceS256 } from '../../../../../src/lib/server/oauth/authorizationCode';

// RFC7636 Appendix B worked example.
const VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('verifyPkceS256', () => {
	test('returns true for the known RFC7636 verifier/challenge pair', () => {
		expect(verifyPkceS256(VERIFIER, CHALLENGE)).toBe(true);
	});
	test('returns false for a mismatched challenge', () => {
		expect(verifyPkceS256(VERIFIER, 'not-the-challenge')).toBe(false);
	});
	test('returns false for a mismatched verifier', () => {
		expect(verifyPkceS256('wrong-verifier', CHALLENGE)).toBe(false);
	});
});
