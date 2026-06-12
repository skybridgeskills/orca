import { describe, expect, it } from 'vitest';

import { escapeHtml, renderOrcaEmail } from './template';

describe('renderOrcaEmail', () => {
	const baseOrg = { name: 'Test Org', primaryColor: '#ff0000', logo: null };

	it('includes the title and org name', () => {
		const html = renderOrcaEmail({ org: baseOrg, title: 'Welcome' });
		expect(html).toContain('Welcome');
		expect(html).toContain('Test Org');
	});

	it('uses the org primary color when provided', () => {
		const html = renderOrcaEmail({ org: baseOrg, title: 'X' });
		expect(html).toContain('#ff0000');
	});

	it('falls back to the default color when primaryColor is null', () => {
		const html = renderOrcaEmail({ org: { ...baseOrg, primaryColor: null }, title: 'X' });
		expect(html).toContain('#2563eb');
		expect(html).not.toContain('#ff0000');
	});

	it('escapes caller-provided text (title/intro), preventing HTML injection', () => {
		const html = renderOrcaEmail({
			org: { ...baseOrg, name: '<b>Org</b>' },
			title: '<script>alert(1)</script>',
			intro: 'a & b < c'
		});
		expect(html).not.toContain('<script>alert(1)</script>');
		expect(html).toContain('&lt;script&gt;');
		expect(html).toContain('&lt;b&gt;Org&lt;/b&gt;');
		expect(html).toContain('a &amp; b &lt; c');
	});

	it('renders a CTA button with the provided url and label', () => {
		const html = renderOrcaEmail({
			org: baseOrg,
			title: 'X',
			cta: { label: 'Claim', url: 'https://example.com/claims/1' }
		});
		expect(html).toContain('https://example.com/claims/1');
		expect(html).toContain('Claim');
	});

	it('inserts bodyHtml verbatim (trusted slot)', () => {
		const html = renderOrcaEmail({ org: baseOrg, title: 'X', bodyHtml: '<em>code: 123456</em>' });
		expect(html).toContain('<em>code: 123456</em>');
	});
});

describe('escapeHtml', () => {
	it('escapes the five HTML-significant characters', () => {
		expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
	});
});
