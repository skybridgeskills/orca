import { withThemeByClassName } from '@storybook/addon-themes';
import type { Preview } from '@storybook/sveltekit';

import '../src/app.css';

const preview: Preview = {
	decorators: [
		withThemeByClassName({
			themes: { light: '', dark: 'dark' },
			defaultTheme: 'light'
		})
	],
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
