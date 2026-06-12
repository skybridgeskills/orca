// Minimal, email-safe HTML template for ORCA transactional emails. Table-based
// layout with inline styles only (no external CSS / flexbox / grid) for broad
// client support. Caller-provided text is escaped; `bodyHtml` is a trusted slot
// (our own i18n output) and is inserted verbatim.

export interface OrcaEmailContent {
	org: { name: string; primaryColor?: string | null; logo?: string | null };
	title: string; // shown in the header band
	intro?: string; // body paragraph(s); split on blank lines
	bodyHtml?: string; // optional pre-rendered safe HTML (caller-guaranteed)
	cta?: { label: string; url: string };
	footer?: string;
}

// Neutral brand fallback when the org has no primaryColor.
const DEFAULT_COLOR = '#2563eb';

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

function paragraphs(intro: string): string {
	return intro
		.split(/\n\s*\n/)
		.map((p) => p.trim())
		.filter(Boolean)
		.map(
			(p) =>
				`<p style="margin:0 0 16px 0;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(
					p
				).replace(/\n/g, '<br/>')}</p>`
		)
		.join('');
}

export function renderOrcaEmail(content: OrcaEmailContent): string {
	const color = content.org.primaryColor || DEFAULT_COLOR;
	const orgName = escapeHtml(content.org.name);
	const title = escapeHtml(content.title);

	const introHtml = content.intro ? paragraphs(content.intro) : '';
	const bodyHtml = content.bodyHtml ?? '';
	const ctaHtml = content.cta
		? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px 0;">
				<tr><td align="center" bgcolor="${color}" style="border-radius:6px;">
					<a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:6px;">${escapeHtml(
						content.cta.label
					)}</a>
				</td></tr>
			</table>`
		: '';
	const footerHtml = content.footer
		? `<p style="margin:16px 0 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">${escapeHtml(
				content.footer
			)}</p>`
		: '';

	return `<!doctype html>
<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>${title}</title>
	</head>
	<body style="margin:0;padding:0;background-color:#f1f5f9;">
		<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9;padding:24px 0;">
			<tr>
				<td align="center">
					<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
						<tr>
							<td style="background-color:${color};padding:20px 32px;">
								<span style="color:#ffffff;font-size:18px;font-weight:700;">${orgName}</span>
							</td>
						</tr>
						<tr>
							<td style="padding:32px;">
								<h1 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;">${title}</h1>
								${introHtml}
								${bodyHtml}
								${ctaHtml}
								${footerHtml}
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
</html>`;
}
