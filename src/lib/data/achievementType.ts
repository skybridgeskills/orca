// OB3 AchievementType vocabulary (spec B.1.28). The allow-list of `Achievement.type`
// terms this app accepts/persists to the `Achievement.achievementType` column. Kept here
// (pure, no Prisma/Svelte) so the form schema and actions share one source of truth.
export const ACHIEVEMENT_TYPES = [
	'Achievement',
	'Assessment',
	'Award',
	'Badge',
	'Certificate',
	'Certification',
	'Competency',
	'Course',
	'Diploma',
	'License',
	'MicroCredential',
	'Membership'
] as const;

export type AchievementType = (typeof ACHIEVEMENT_TYPES)[number];

export function isAchievementType(value: unknown): value is AchievementType {
	return typeof value === 'string' && (ACHIEVEMENT_TYPES as readonly string[]).includes(value);
}
