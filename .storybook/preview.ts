import '../src/app.css';
import type { Preview } from '@storybook/sveltekit';

// Initialize dark mode based on system preference (orca uses class dark mode:
// `.dark` on <html>, matching @custom-variant dark in src/app.css).
function initializeDarkMode() {
	if (typeof window === 'undefined') return;

	const theme = localStorage.getItem('theme') || 'system';
	const html = document.documentElement;

	if (theme === 'system') {
		const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light';
		if (systemTheme === 'dark') {
			html.classList.add('dark');
		} else {
			html.classList.remove('dark');
		}
	} else if (theme === 'dark') {
		html.classList.add('dark');
	} else {
		html.classList.remove('dark');
	}
}

// Set theme immediately to prevent flash
if (typeof window !== 'undefined') {
	initializeDarkMode();

	// Listen for system preference changes
	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
	mediaQuery.addEventListener('change', () => {
		const theme = localStorage.getItem('theme') || 'system';
		if (theme === 'system') {
			initializeDarkMode();
		}
	});
}

const preview: Preview = {
	decorators: [],
	parameters: {
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /date$/i
			}
		},
		a11y: {
			// 'todo' - show a11y violations in the test UI only
			// 'error' - fail CI on a11y violations
			// 'off' - skip a11y checks entirely
			test: 'todo'
		}
	}
};

export default preview;
