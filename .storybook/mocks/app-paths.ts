// Storybook mock for `$app/paths`.
//
// @storybook/sveltekit mocks `$app/forms`, `$app/navigation`, `$app/state`,
// and `$app/stores`, but NOT `$app/paths`. Components that call `resolve()`
// (Breadcrumbs, NavItem, Button, Tabs, AchievementSummary, …) therefore threw
// at render in Storybook, producing blank stories. These minimal pass-through
// implementations make those components render. Wired via the `$app/paths`
// alias in `.storybook/main.ts` (Storybook only — production code is untouched).

export const base = '';
export const assets = '';

export function resolve(path: string): string {
	return path;
}

export function asset(file: string): string {
	return file;
}

// Deprecated SvelteKit API, kept for any component that still imports it.
export function resolveRoute(id: string, params: Record<string, string> = {}): string {
	return Object.entries(params).reduce((acc, [key, value]) => acc.replace(`[${key}]`, value), id);
}
