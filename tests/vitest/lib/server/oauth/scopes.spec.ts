import { describe, expect, test } from 'vitest';

import {
	API_SCOPES,
	SCOPE_CREDENTIAL_READONLY,
	SCOPE_OFFLINE_ACCESS,
	SUPPORTED_API_SCOPES,
	intersectSupported,
	intersectSupportedApi,
	isScopeSubset,
	parseScopeString
} from '../../../../../src/lib/server/oauth/scopes';

describe('parseScopeString', () => {
	test('splits on whitespace and drops empties', () => {
		expect(parseScopeString('a  b\tc')).toEqual(['a', 'b', 'c']);
	});
	test('handles null/undefined/empty', () => {
		expect(parseScopeString(null)).toEqual([]);
		expect(parseScopeString(undefined)).toEqual([]);
		expect(parseScopeString('')).toEqual([]);
	});
});

describe('intersectSupported', () => {
	test('drops unsupported upsert/profile scopes', () => {
		const requested = [
			SCOPE_CREDENTIAL_READONLY,
			SCOPE_OFFLINE_ACCESS,
			'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.upsert',
			'https://purl.imsglobal.org/spec/ob/v3p0/scope/profile.readonly'
		];
		expect(intersectSupported(requested)).toEqual([
			SCOPE_CREDENTIAL_READONLY,
			SCOPE_OFFLINE_ACCESS
		]);
	});
});

describe('isScopeSubset', () => {
	test('true when all subset scopes are granted', () => {
		expect(isScopeSubset(['a'], ['a', 'b'])).toBe(true);
	});
	test('false when a subset scope is missing', () => {
		expect(isScopeSubset(['a', 'c'], ['a', 'b'])).toBe(false);
	});
});

describe('intersectSupportedApi', () => {
	test('keeps only SUPPORTED_API_SCOPES and drops unknown/Backpack scopes', () => {
		const requested = [
			'AchievementClaim.readonly',
			'Achievement.readonly',
			'Backpack.readonly',
			'Nonsense.write'
		];
		expect(intersectSupportedApi(requested)).toEqual([
			'AchievementClaim.readonly',
			'Achievement.readonly'
		]);
	});
	test('SUPPORTED_API_SCOPES never includes Backpack', () => {
		expect(SUPPORTED_API_SCOPES.some((s) => s.startsWith('Backpack'))).toBe(false);
	});
});

describe('API_SCOPES taxonomy', () => {
	test('scope names are unique', () => {
		const names = API_SCOPES.map((s) => s.scope);
		expect(new Set(names).size).toBe(names.length);
	});
	test('AchievementClaim.readonly is enforced', () => {
		const def = API_SCOPES.find((s) => s.scope === 'AchievementClaim.readonly');
		expect(def?.enforced).toBe(true);
	});
});
