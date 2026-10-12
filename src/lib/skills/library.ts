import { mintResultDescriptionId, RESULT_TYPE_DEFAULT } from '$lib/data/resultDescription';

import { DEFAULT_SKILL_LEVELS } from './durableSkills';
import { staticSkillLibrary } from './staticLibrary';

// Skill-library service abstraction. Pure types + a tiny factory; framework-free
// and trivially unit-testable (mirrors the style of `$lib/data/alignment.ts`).
// The seed text for the static impl lives in `durableSkills.ts`.

export interface DurableSkill {
	/** stable slug, e.g. 'critical-thinking' — used for de-dupe / identifiers */
	key: string;
	/** short label → achievement name */
	label: string;
	/** longer skill statement → achievement description */
	statement: string;
	/** ordered low→high levels → seeded ResultDescription.allowedValue */
	levels: string[];
}

export interface SkillLibrary {
	list(): Promise<DurableSkill[]>;
	search(query: string): Promise<DurableSkill[]>;
}

/**
 * Default ordered low→high competency levels seeded onto a skill's ResultDescription.
 * Re-exported from the leaf data module to keep this module free of an init-order
 * cycle (library → staticLibrary → durableSkills → library).
 */
export { DEFAULT_SKILL_LEVELS };

/**
 * Resolve the skill library implementation. Call sites use this rather than
 * importing the static impl directly so a future HTTP-backed impl can be swapped
 * in (branching on org/env config) without touching callers.
 */
export function getSkillLibrary(): SkillLibrary {
	// Future: branch on org/env config to return an HTTP-backed impl.
	return staticSkillLibrary;
}

/**
 * Build the seeded OB3 ResultDescription for a durable skill: a single competency
 * criterion whose ordered `allowedValue` levels come from the skill. Reuses the
 * rubrics helper (`mintResultDescriptionId` / `RESULT_TYPE_DEFAULT`) so ids and the
 * result-type default stay consistent with admin-edited rubrics.
 */
export function buildSkillResultDescription(skill: DurableSkill): App.ResultDescription {
	return {
		id: mintResultDescriptionId(),
		type: ['ResultDescription'],
		name: skill.label, // terse: levels of this competency
		resultType: RESULT_TYPE_DEFAULT, // align with rubrics RESULT_TYPE_DEFAULT ('Result')
		allowedValue: skill.levels // ordered low→high
	};
}
