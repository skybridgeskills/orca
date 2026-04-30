import { describe, it, expect } from 'vitest';
import {
	alignmentRowsFromAchievementJson,
	alignmentSchema,
	type Alignment
} from '$lib/data/alignment';

describe('alignmentRowsFromAchievementJson', () => {
	it('reads new shape: alignment + targetUrl', () => {
		const rows = alignmentRowsFromAchievementJson({
			alignment: [
				{
					targetUrl: 'https://example.com/skill',
					targetName: 'Example',
					targetDescription: 'desc',
					targetCode: 'ABC'
				}
			]
		});
		expect(rows).toHaveLength(1);
		expect(rows[0]).toEqual({
			targetUrl: 'https://example.com/skill',
			targetName: 'Example',
			targetDescription: 'desc',
			targetCode: 'ABC'
		});
	});

	it('reads legacy alignments + targetId', () => {
		const rows = alignmentRowsFromAchievementJson({
			alignments: [
				{
					targetId: 'https://legacy.test/x',
					targetName: 'Legacy'
				}
			]
		});
		expect(rows).toHaveLength(1);
		expect(rows[0].targetUrl).toBe('https://legacy.test/x');
		expect(rows[0].targetName).toBe('Legacy');
	});

	it('returns empty when no alignment data', () => {
		expect(alignmentRowsFromAchievementJson({})).toEqual([]);
		expect(alignmentRowsFromAchievementJson(null)).toEqual([]);
	});
});

describe('alignmentSchema', () => {
	it('accepts valid targetUrl', async () => {
		const data: Alignment = {
			targetUrl: 'https://example.com/x',
			targetName: 'Name'
		};
		await expect(alignmentSchema.validate(data)).resolves.toEqual(data);
	});

	it('rejects missing targetUrl', async () => {
		await expect(alignmentSchema.validate({ targetName: 'x' })).rejects.toBeDefined();
	});
});
