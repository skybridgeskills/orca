import { describe, expect, it } from 'vitest';

import { achievementFormSchema, resolveSelfRequirement, SELF_REQUIREMENT } from './achievementForm';

const UUID = '11111111-1111-4111-8111-111111111111';

describe('resolveSelfRequirement', () => {
	it('maps the self sentinel to the provided own id', () => {
		expect(resolveSelfRequirement(SELF_REQUIREMENT, 'abc')).toBe('abc');
	});

	it('passes a real id through unchanged', () => {
		expect(resolveSelfRequirement(UUID, 'abc')).toBe(UUID);
	});

	it('returns null for empty/nullish values', () => {
		expect(resolveSelfRequirement('', 'abc')).toBeNull();
		expect(resolveSelfRequirement(null, 'abc')).toBeNull();
		expect(resolveSelfRequirement(undefined, 'abc')).toBeNull();
	});
});

describe('achievementFormSchema: capabilities_inviteRequires', () => {
	const at = (value: unknown) =>
		achievementFormSchema.validateAt('capabilities_inviteRequires', {
			capabilities_inviteRequires: value
		});

	it("accepts the 'self' sentinel", async () => {
		await expect(at(SELF_REQUIREMENT)).resolves.toBeDefined();
	});

	it('accepts a UUID', async () => {
		await expect(at(UUID)).resolves.toBe(UUID);
	});

	it('accepts null / empty (no requirement)', async () => {
		await expect(at(null)).resolves.toBeNull();
		await expect(at('')).resolves.toBeNull();
	});

	it('rejects a non-UUID, non-sentinel string', async () => {
		await expect(at('not-a-uuid')).rejects.toThrow();
	});
});
