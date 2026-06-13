import { describe, expect, it } from 'vitest';

import { buildSkillResultDescription, DEFAULT_SKILL_LEVELS, getSkillLibrary } from './library';

const library = getSkillLibrary();

describe('getSkillLibrary().list', () => {
	it('returns exactly 20 well-formed skills', async () => {
		const skills = await library.list();
		expect(skills).toHaveLength(20);
		for (const skill of skills) {
			expect(skill.key.trim()).not.toBe('');
			expect(skill.label.trim()).not.toBe('');
			expect(skill.statement.trim()).not.toBe('');
			expect(Array.isArray(skill.levels)).toBe(true);
			expect(skill.levels.length).toBeGreaterThan(0);
			expect(skill.levels.every((level) => level.trim() !== '')).toBe(true);
		}
	});

	it('has unique keys', async () => {
		const skills = await library.list();
		const keys = skills.map((s) => s.key);
		expect(new Set(keys).size).toBe(keys.length);
	});

	it('returns a copy: mutating the result does not affect a later call', async () => {
		const first = await library.list();
		first.pop();
		first.push({ key: 'x', label: 'X', statement: 'X', levels: ['a'] });
		const second = await library.list();
		expect(second).toHaveLength(20);
		expect(second.some((s) => s.key === 'x')).toBe(false);
	});
});

describe('getSkillLibrary().search', () => {
	it('returns all skills for an empty or whitespace query', async () => {
		expect(await library.search('')).toHaveLength(20);
		expect(await library.search('   ')).toHaveLength(20);
	});

	it('filters case-insensitively over label, statement, and key', async () => {
		const byLabel = await library.search('CRITICAL');
		expect(byLabel.some((s) => s.key === 'critical-thinking')).toBe(true);

		const byKey = await library.search('problem-solving');
		expect(byKey.some((s) => s.key === 'problem-solving')).toBe(true);

		const byStatement = await library.search('deadlines');
		expect(byStatement.some((s) => s.key === 'time-management')).toBe(true);
	});

	it('returns an empty array when nothing matches', async () => {
		expect(await library.search('zzz-no-such-skill')).toEqual([]);
	});

	it('returns a copy: mutating the result does not affect a later call', async () => {
		const first = await library.search('');
		first.length = 0;
		const second = await library.search('');
		expect(second).toHaveLength(20);
	});
});

describe('buildSkillResultDescription', () => {
	it('builds a minted RD from the skill', async () => {
		const [skill] = await library.list();
		const rd = buildSkillResultDescription(skill);

		expect(rd.id).toMatch(/^urn:uuid:[0-9a-f-]+$/i);
		expect(rd.type).toEqual(['ResultDescription']);
		expect(rd.name).toBe(skill.label);
		expect(rd.resultType).toBe('Result');
		expect(rd.allowedValue).toEqual(skill.levels);
	});

	it('mints a fresh id on each call', async () => {
		const [skill] = await library.list();
		const a = buildSkillResultDescription(skill);
		const b = buildSkillResultDescription(skill);
		expect(a.id).not.toBe(b.id);
	});

	it('defaults skill levels to DEFAULT_SKILL_LEVELS', async () => {
		const skills = await library.list();
		expect(skills.every((s) => s.levels === DEFAULT_SKILL_LEVELS)).toBe(true);
		expect(DEFAULT_SKILL_LEVELS).toEqual(['Emerging', 'Developing', 'Proficient', 'Advanced']);
	});
});
