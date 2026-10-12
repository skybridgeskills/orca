import { v4 as uuidv4 } from 'uuid';

// Pure rubric logic for OB3 Result / ResultDescription. No Prisma, no Svelte — keep
// it trivially unit-testable (mirrors the style of `alignment.ts`). Types live in the
// ambient `App` namespace (`App.ResultDescription`, `App.Result`).

// Stable sentinel id for the default Pass/Fail rubric used when an achievement has no
// configured rubric. This constant is a contract — NEVER regenerate it.
export const DEFAULT_RESULT_DESCRIPTION_ID = 'urn:uuid:00000000-0000-4000-8000-000000000001';

export const RESULT_TYPE_DEFAULT = 'Result';

export const DEFAULT_RESULT_DESCRIPTION: App.ResultDescription = {
	id: DEFAULT_RESULT_DESCRIPTION_ID,
	type: ['ResultDescription'],
	name: 'Result',
	resultType: RESULT_TYPE_DEFAULT,
	allowedValue: ['Fail', 'Pass']
};

export function mintResultDescriptionId(): string {
	return `urn:uuid:${uuidv4()}`;
}

function asObject(json: unknown): Record<string, unknown> {
	return json != null && typeof json === 'object' && !Array.isArray(json)
		? (json as Record<string, unknown>)
		: {};
}

/** The configured current rubric (may be empty). */
export function getCurrentResultDescriptions(achievementJson: unknown): App.ResultDescription[] {
	const rds = asObject(achievementJson).resultDescriptions;
	return Array.isArray(rds) ? (rds as App.ResultDescription[]) : [];
}

/** The rubric a reviewer uses: the configured RDs, or the default Pass/Fail when none. */
export function getRubricForReview(achievementJson: unknown): App.ResultDescription[] {
	const current = getCurrentResultDescriptions(achievementJson);
	return current.length ? current : [DEFAULT_RESULT_DESCRIPTION];
}

/** Ids of the current rubric; the default sentinel id when no rubric is configured. */
export function currentResultDescriptionIds(achievementJson: unknown): Set<string> {
	const current = getCurrentResultDescriptions(achievementJson);
	return current.length
		? new Set(current.map((rd) => rd.id))
		: new Set([DEFAULT_RESULT_DESCRIPTION_ID]);
}

export function isCurrentRD(id: string, achievementJson: unknown): boolean {
	return currentResultDescriptionIds(achievementJson).has(id);
}

// A rubric row as submitted by the form: existing rows carry an `id`, new rows do not.
export interface SubmittedResultDescription {
	id?: string;
	name: string;
	resultType?: string;
	allowedValue: string[];
	requiredValue?: string;
}

/**
 * Parse `resultDescription[i].{id,name,allowedValue[j]}` fields out of submitted form
 * data (mirrors `parseAlignmentsFromFormData`). Trims values, drops blank values, and
 * drops rows with no name or no allowed values. Callers should still `stripTags`.
 */
export function parseRubricFromFormData(formData: FormData): SubmittedResultDescription[] {
	const submitted: SubmittedResultDescription[] = [];
	let i = 0;
	while (formData.has(`resultDescription[${i}].name`)) {
		const name = (formData.get(`resultDescription[${i}].name`)?.toString() ?? '').trim();
		const id = formData.get(`resultDescription[${i}].id`)?.toString() || undefined;
		const allowedValue: string[] = [];
		let j = 0;
		while (formData.has(`resultDescription[${i}].allowedValue[${j}]`)) {
			const value = (
				formData.get(`resultDescription[${i}].allowedValue[${j}]`)?.toString() ?? ''
			).trim();
			if (value) allowedValue.push(value);
			j++;
		}
		if (name && allowedValue.length) submitted.push({ id, name, allowedValue });
		i++;
	}
	return submitted;
}

// Order-sensitive content comparison (allowedValue is an ordered list low→high).
function contentUnchanged(prior: App.ResultDescription, s: SubmittedResultDescription): boolean {
	const submittedResultType = s.resultType || RESULT_TYPE_DEFAULT;
	const priorResultType = prior.resultType || RESULT_TYPE_DEFAULT;
	return (
		prior.name === s.name &&
		priorResultType === submittedResultType &&
		(prior.requiredValue || undefined) === (s.requiredValue || undefined) &&
		prior.allowedValue.length === s.allowedValue.length &&
		prior.allowedValue.every((v, i) => v === s.allowedValue[i])
	);
}

/**
 * Re-mint rule: match submitted rows to existing by id; keep the id when content is
 * unchanged, mint a fresh id when content changed or the row is new. Removed rows drop
 * out (they simply don't appear). Returns the new current `resultDescriptions[]`.
 */
export function diffAndApplyRubric(
	submitted: SubmittedResultDescription[],
	existing: App.ResultDescription[]
): App.ResultDescription[] {
	const byId = new Map(existing.map((rd) => [rd.id, rd]));
	return submitted.map((s) => {
		const prior = s.id ? byId.get(s.id) : undefined;
		const id = prior && contentUnchanged(prior, s) ? prior.id : mintResultDescriptionId();
		const rd: App.ResultDescription = {
			id,
			type: ['ResultDescription'],
			name: s.name,
			resultType: s.resultType || RESULT_TYPE_DEFAULT,
			allowedValue: s.allowedValue
		};
		if (s.requiredValue) rd.requiredValue = s.requiredValue;
		return rd;
	});
}

/**
 * Build self-describing Results from `{ [rdId]: value }` picks against the rubric used
 * for the review. Skips RDs with no pick; throws if a pick is not an allowed value.
 */
export function buildResults(
	picks: Record<string, string>,
	rubric: App.ResultDescription[]
): App.Result[] {
	const results: App.Result[] = [];
	for (const rd of rubric) {
		const value = picks[rd.id];
		if (value === undefined || value === '') continue;
		if (!rd.allowedValue.includes(value)) {
			throw new Error(`Value "${value}" is not allowed for result description ${rd.id}`);
		}
		results.push({ type: ['Result'], resultDescription: rd.id, value, name: rd.name });
	}
	return results;
}

/**
 * Read `results` out of a ClaimEndorsement's `json`, which the app stores as a
 * JSON *string* (`JSON.stringify({ narrative, id, results })`). Returns [] if absent
 * or unparseable.
 */
export function resultsFromEndorsementJson(json: unknown): App.Result[] {
	let obj: unknown = json;
	if (typeof json === 'string') {
		try {
			obj = JSON.parse(json);
		} catch {
			return [];
		}
	}
	const results = asObject(obj).results;
	return Array.isArray(results) ? (results as App.Result[]) : [];
}

/** A review is current iff every result's RD id is in the achievement's current set. */
export function reviewIsCurrent(
	results: App.Result[] | undefined | null,
	achievementJson: unknown
): boolean {
	if (!results || !results.length) return true; // narrative-only / no-pick reviews don't go stale
	const ids = currentResultDescriptionIds(achievementJson);
	return results.every((r) => ids.has(r.resultDescription));
}
