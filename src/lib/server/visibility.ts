import type { Visibility } from '@prisma/client';

const VISIBILITY_VALUES: Visibility[] = ['PUBLIC', 'COMMUNITY', 'ACHIEVEMENT', 'PRIVATE'];

/** Type guard: is `value` one of the Prisma `Visibility` enum members? */
export function isVisibility(value: unknown): value is Visibility {
	return typeof value === 'string' && (VISIBILITY_VALUES as string[]).includes(value);
}
