import { describe, expect, it } from 'vitest';

import {
	buildResults,
	currentResultDescriptionIds,
	DEFAULT_RESULT_DESCRIPTION,
	DEFAULT_RESULT_DESCRIPTION_ID,
	diffAndApplyRubric,
	getCurrentResultDescriptions,
	getRubricForReview,
	isCurrentRD,
	resultsFromEndorsementJson,
	reviewIsCurrent,
	type SubmittedResultDescription
} from './resultDescription';

const rd = (over: Partial<App.ResultDescription> = {}): App.ResultDescription => ({
	id: 'urn:uuid:rd-1',
	type: ['ResultDescription'],
	name: 'Quality',
	resultType: 'Result',
	allowedValue: ['Low', 'High'],
	...over
});

describe('rubric readers', () => {
	it('getCurrentResultDescriptions returns [] for empty/non-object json', () => {
		expect(getCurrentResultDescriptions(null)).toEqual([]);
		expect(getCurrentResultDescriptions({})).toEqual([]);
		expect(getCurrentResultDescriptions({ resultDescriptions: 'x' })).toEqual([]);
		expect(getCurrentResultDescriptions({ resultDescriptions: [rd()] })).toHaveLength(1);
	});

	it('getRubricForReview falls back to the default Pass/Fail when no rubric', () => {
		expect(getRubricForReview({})).toEqual([DEFAULT_RESULT_DESCRIPTION]);
		expect(getRubricForReview({ resultDescriptions: [rd()] })).toHaveLength(1);
	});

	it('currentResultDescriptionIds uses the default sentinel id when no rubric', () => {
		expect(currentResultDescriptionIds({})).toEqual(new Set([DEFAULT_RESULT_DESCRIPTION_ID]));
		expect(
			currentResultDescriptionIds({ resultDescriptions: [rd({ id: 'a' }), rd({ id: 'b' })] })
		).toEqual(new Set(['a', 'b']));
	});

	it('isCurrentRD reflects membership', () => {
		const json = { resultDescriptions: [rd({ id: 'a' })] };
		expect(isCurrentRD('a', json)).toBe(true);
		expect(isCurrentRD('b', json)).toBe(false);
	});
});

describe('diffAndApplyRubric', () => {
	const existing = [rd({ id: 'urn:uuid:keep', name: 'Quality', allowedValue: ['Low', 'High'] })];

	it('keeps the id when content is unchanged', () => {
		const submitted: SubmittedResultDescription[] = [
			{ id: 'urn:uuid:keep', name: 'Quality', allowedValue: ['Low', 'High'] }
		];
		expect(diffAndApplyRubric(submitted, existing)[0].id).toBe('urn:uuid:keep');
	});

	it('re-mints when the name changes', () => {
		const out = diffAndApplyRubric(
			[{ id: 'urn:uuid:keep', name: 'Quality v2', allowedValue: ['Low', 'High'] }],
			existing
		);
		expect(out[0].id).not.toBe('urn:uuid:keep');
		expect(out[0].id).toMatch(/^urn:uuid:/);
	});

	it('re-mints when allowedValue is reordered (order-sensitive)', () => {
		const out = diffAndApplyRubric(
			[{ id: 'urn:uuid:keep', name: 'Quality', allowedValue: ['High', 'Low'] }],
			existing
		);
		expect(out[0].id).not.toBe('urn:uuid:keep');
	});

	it('re-mints when requiredValue changes', () => {
		const out = diffAndApplyRubric(
			[
				{
					id: 'urn:uuid:keep',
					name: 'Quality',
					allowedValue: ['Low', 'High'],
					requiredValue: 'High'
				}
			],
			existing
		);
		expect(out[0].id).not.toBe('urn:uuid:keep');
		expect(out[0].requiredValue).toBe('High');
	});

	it('mints an id for a new row (no id) and drops removed rows', () => {
		const out = diffAndApplyRubric([{ name: 'Fresh', allowedValue: ['No', 'Yes'] }], existing);
		expect(out).toHaveLength(1);
		expect(out[0].id).toMatch(/^urn:uuid:/);
		expect(out[0].id).not.toBe('urn:uuid:keep'); // the old one dropped out
	});
});

describe('buildResults', () => {
	const rubric = [rd({ id: 'a', name: 'Quality', allowedValue: ['Low', 'High'] })];

	it('builds self-describing results and skips RDs with no pick', () => {
		expect(buildResults({ a: 'High' }, rubric)).toEqual([
			{ type: ['Result'], resultDescription: 'a', value: 'High', name: 'Quality' }
		]);
		expect(buildResults({}, rubric)).toEqual([]);
	});

	it('throws on a value outside allowedValue', () => {
		expect(() => buildResults({ a: 'Nope' }, rubric)).toThrow();
	});
});

describe('reviewIsCurrent', () => {
	it('is true when every result RD is in the current set', () => {
		const json = { resultDescriptions: [rd({ id: 'a' })] };
		const results: App.Result[] = [
			{ type: ['Result'], resultDescription: 'a', value: 'High', name: 'Q' }
		];
		expect(reviewIsCurrent(results, json)).toBe(true);
	});

	it('stales a default-sentinel review once a real rubric is configured', () => {
		const defaultReview: App.Result[] = [
			{
				type: ['Result'],
				resultDescription: DEFAULT_RESULT_DESCRIPTION_ID,
				value: 'Pass',
				name: 'Result'
			}
		];
		expect(reviewIsCurrent(defaultReview, {})).toBe(true); // no rubric → sentinel is current
		expect(reviewIsCurrent(defaultReview, { resultDescriptions: [rd({ id: 'a' })] })).toBe(false);
	});

	it('treats narrative-only (no results) reviews as current', () => {
		expect(reviewIsCurrent(undefined, { resultDescriptions: [rd({ id: 'a' })] })).toBe(true);
		expect(reviewIsCurrent([], { resultDescriptions: [rd({ id: 'a' })] })).toBe(true);
	});
});

describe('resultsFromEndorsementJson', () => {
	it('parses results from a JSON string (how endorsements are stored)', () => {
		const json = JSON.stringify({
			narrative: 'good',
			results: [{ type: ['Result'], resultDescription: 'a', value: 'High', name: 'Q' }]
		});
		expect(resultsFromEndorsementJson(json)).toHaveLength(1);
	});

	it('parses results from an object and returns [] for missing/garbage', () => {
		expect(resultsFromEndorsementJson({ results: [] })).toEqual([]);
		expect(resultsFromEndorsementJson('{"narrative":"x"}')).toEqual([]);
		expect(resultsFromEndorsementJson('not json')).toEqual([]);
		expect(resultsFromEndorsementJson(null)).toEqual([]);
	});
});

describe('current-review threshold counting (filter composition)', () => {
	// Mirrors how the claim flow filters endorsements before counting:
	// existingEndorsements.filter((ee) => reviewIsCurrent(resultsFromEndorsementJson(ee.json), json))
	const filterCurrent = (endorsements: { json: unknown }[], achievementJson: unknown) =>
		endorsements.filter((ee) =>
			reviewIsCurrent(resultsFromEndorsementJson(ee.json), achievementJson)
		);

	const review = (rdId: string, value = 'High') =>
		JSON.stringify({ results: [{ type: ['Result'], resultDescription: rdId, value, name: 'Q' }] });

	it('excludes a stale review and includes a current one when a rubric exists', () => {
		const json = { resultDescriptions: [rd({ id: 'current' })] };
		const endorsements = [
			{ json: review('current') }, // current → counts
			{ json: review('retired') }, // references a dropped RD → stale, excluded
			{ json: '{"narrative":"no picks"}' } // narrative-only → current, counts
		];
		expect(filterCurrent(endorsements, json)).toHaveLength(2);
	});

	it('counts default-sentinel and narrative-only reviews when no rubric is configured', () => {
		const endorsements = [
			{ json: review(DEFAULT_RESULT_DESCRIPTION_ID, 'Pass') }, // default sentinel → current
			{ json: '{"narrative":"x"}' } // narrative-only → current
		];
		expect(filterCurrent(endorsements, {})).toHaveLength(2);
	});
});
