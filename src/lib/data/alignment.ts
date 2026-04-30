import * as yup from 'yup';

export interface Alignment {
	targetUrl: string;
	targetName: string;
	targetDescription?: string;
	targetCode?: string;
}

export const alignmentSchema = yup.object().shape({
	targetUrl: yup.string().url('Target URL must be valid').required('Target URL is required'),
	targetName: yup
		.string()
		.required('Target name is required')
		.max(255, 'Target name must be 255 characters or less'),
	targetDescription: yup
		.string()
		.max(1000, 'Description must be 1000 characters or less')
		.optional(),
	targetCode: yup.string().max(100, 'Target code must be 100 characters or less').optional()
});

export const alignmentsArraySchema = yup.array().of(alignmentSchema);

export function isValidAlignment(alignment: Partial<Alignment>): alignment is Alignment {
	return alignmentSchema.isValidSync(alignment);
}

export function sanitizeAlignment(alignment: Alignment): Alignment {
	return {
		targetUrl: alignment.targetUrl.trim(),
		targetName: alignment.targetName.trim(),
		...(alignment.targetDescription?.trim()
			? { targetDescription: alignment.targetDescription.trim() }
			: {}),
		...(alignment.targetCode?.trim() ? { targetCode: alignment.targetCode.trim() } : {})
	};
}

/** Read alignment rows from `achievement.json`; supports `alignment` and legacy `alignments` / `targetId`. */
export function alignmentRowsFromAchievementJson(json: unknown): Alignment[] {
	if (json == null || typeof json !== 'object' || Array.isArray(json)) {
		return [];
	}
	const obj = json as Record<string, unknown>;
	let rows: unknown[] | undefined;
	if ('alignment' in obj && Array.isArray(obj.alignment)) {
		rows = obj.alignment as unknown[];
	} else if ('alignments' in obj && Array.isArray(obj.alignments)) {
		rows = obj.alignments as unknown[];
	} else {
		return [];
	}

	return rows
		.map((row): Alignment | null => {
			if (row === null || typeof row !== 'object' || Array.isArray(row)) {
				return null;
			}
			const r = row as Record<string, unknown>;
			const targetUrlRaw =
				(typeof r.targetUrl === 'string' && r.targetUrl.trim()) ||
				(typeof r.targetId === 'string' && r.targetId.trim()) ||
				'';
			const targetNameRaw = typeof r.targetName === 'string' ? r.targetName.trim() : '';
			if (!targetUrlRaw || !targetNameRaw) {
				return null;
			}
			const out: Alignment = {
				targetUrl: targetUrlRaw,
				targetName: targetNameRaw
			};
			if (typeof r.targetDescription === 'string' && r.targetDescription.trim()) {
				out.targetDescription = r.targetDescription.trim();
			}
			if (typeof r.targetCode === 'string' && r.targetCode.trim()) {
				out.targetCode = r.targetCode.trim();
			}
			return out;
		})
		.filter((x): x is Alignment => x !== null);
}
