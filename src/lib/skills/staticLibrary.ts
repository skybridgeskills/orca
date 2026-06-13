import { durableSkills } from './durableSkills';
import type { DurableSkill, SkillLibrary } from './library';

// Static, in-memory implementation of `SkillLibrary` backed by the 20 hardcoded
// durable skills. Both methods resolve a COPY of the backing array so callers can
// never mutate the internal data.

export const staticSkillLibrary: SkillLibrary = {
	list(): Promise<DurableSkill[]> {
		return Promise.resolve([...durableSkills]);
	},

	search(query: string): Promise<DurableSkill[]> {
		const q = query.trim().toLowerCase();
		if (!q) {
			return Promise.resolve([...durableSkills]);
		}
		const matches = durableSkills.filter((skill) => {
			const haystack = `${skill.label} ${skill.statement} ${skill.key}`.toLowerCase();
			return haystack.includes(q);
		});
		return Promise.resolve(matches);
	}
};
