import type { DurableSkill } from './library';

// Seed/reference data for the durable-skills library. This is admin/seed copy —
// the chosen skill's label/statement are stored verbatim on the achievement row,
// like any admin-typed achievement. NOT interactive UI chrome: intentionally
// plain English and NOT routed through paraglide (see P1 phase notes).

// Defined here (the dependency-free leaf module) and re-exported from `library.ts`
// so the public import path is `$lib/skills/library`, while avoiding a module
// init-order cycle (library → staticLibrary → durableSkills → library).
/** Default ordered low→high competency levels seeded onto a skill's ResultDescription. */
export const DEFAULT_SKILL_LEVELS = ['Emerging', 'Developing', 'Proficient', 'Advanced'];

/** The 20 durable skills offered during skills onboarding. Keys are stable. */
export const durableSkills: DurableSkill[] = [
	{
		key: 'critical-thinking',
		label: 'Critical Thinking',
		statement:
			'I can analyze information, question assumptions, and weigh evidence to reach well-reasoned conclusions.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'problem-solving',
		label: 'Problem Solving',
		statement:
			'I can define a problem, generate options, and work through obstacles to reach a workable solution.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'communication',
		label: 'Communication',
		statement:
			'I can express ideas clearly in speech and writing, adapting my message to my audience and purpose.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'collaboration',
		label: 'Collaboration',
		statement:
			'I can work effectively with others toward a shared goal, contributing my part and supporting the team.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'adaptability',
		label: 'Adaptability',
		statement:
			'I can adjust my approach in response to change, new information, or unexpected challenges.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'creativity',
		label: 'Creativity',
		statement:
			'I can generate original ideas and connect concepts in new ways to produce inventive outcomes.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'leadership',
		label: 'Leadership',
		statement:
			'I can guide and motivate others toward a shared goal, taking responsibility for outcomes.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'emotional-intelligence',
		label: 'Emotional Intelligence',
		statement:
			'I can recognize and manage my own emotions and respond thoughtfully to the emotions of others.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'time-management',
		label: 'Time Management',
		statement:
			'I can prioritize tasks, set realistic goals, and use my time to meet deadlines consistently.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'self-direction',
		label: 'Self-Direction',
		statement:
			'I can set my own goals, monitor my progress, and take ownership of my learning without constant oversight.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'resilience',
		label: 'Resilience',
		statement:
			'I can recover from setbacks, persist through difficulty, and stay focused under pressure.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'active-listening',
		label: 'Active Listening',
		statement:
			'I can give others my full attention, check my understanding, and respond to what they actually mean.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'decision-making',
		label: 'Decision Making',
		statement:
			'I can evaluate options against clear criteria and commit to a choice, accepting its trade-offs.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'conflict-resolution',
		label: 'Conflict Resolution',
		statement:
			'I can address disagreements constructively and help people find common ground and a path forward.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'digital-literacy',
		label: 'Digital Literacy',
		statement:
			'I can find, evaluate, and use digital tools and information safely, effectively, and responsibly.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'cultural-competence',
		label: 'Cultural Competence',
		statement:
			'I can engage respectfully across cultures and adapt my behavior to work well with diverse people.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'initiative',
		label: 'Initiative',
		statement:
			'I can identify what needs doing and act on it proactively, without waiting to be asked.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'attention-to-detail',
		label: 'Attention to Detail',
		statement:
			'I can produce accurate, thorough work and catch errors or inconsistencies before they cause problems.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'growth-mindset',
		label: 'Growth Mindset',
		statement:
			'I can treat challenges and feedback as opportunities to learn, believing my abilities can grow with effort.',
		levels: DEFAULT_SKILL_LEVELS
	},
	{
		key: 'teamwork-facilitation',
		label: 'Facilitation',
		statement:
			'I can guide a group through a discussion or process so that everyone contributes and the group reaches its goal.',
		levels: DEFAULT_SKILL_LEVELS
	}
];
