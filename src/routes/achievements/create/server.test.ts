import { beforeEach, describe, expect, it, vi } from 'vitest';

// P2: prove the create action persists `achievementType` to the column and a seeded
// resultDescription into json.resultDescriptions (minted urn:uuid id, ordered
// allowedValue), and rejects an unknown achievementType. Real form schema + rubric
// helpers; only the IO boundaries (prisma, permissions, media) are mocked.

const mockCreate = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockCanEdit = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		achievement: { create: mockCreate, findFirst: vi.fn() },
		user: { findMany: mockUserFindMany }
	}
}));

vi.mock('$lib/server/permissions', () => ({
	canEditAchievements: mockCanEdit
}));

vi.mock('$lib/server/media', () => ({
	getUploadUrl: vi.fn(async () => null)
}));

import { actions } from './+page.server';

const ORG = { id: 'org-1', json: {} };

function makeEvent(formData: FormData) {
	return {
		request: { formData: async () => formData },
		locals: {
			org: ORG,
			session: { user: { id: 'user-1', orgRole: 'ADMIN' } }
		}
	} as unknown as Parameters<typeof actions.default>[0];
}

function baseForm(): FormData {
	const fd = new FormData();
	fd.set('name', 'Test skill');
	fd.set('description', 'A durable skill');
	return fd;
}

describe('achievements/create action: achievementType + seeded resultDescriptions', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCanEdit.mockResolvedValue(true);
		mockUserFindMany.mockResolvedValue([]);
		mockCreate.mockImplementation(async ({ data }) => ({ ...data }));
	});

	it('persists achievementType column and a seeded RD with a minted id + ordered allowedValue', async () => {
		const fd = baseForm();
		fd.set('achievementType', 'Competency');
		fd.set('resultDescription[0].name', 'Proficiency');
		fd.set('resultDescription[0].allowedValue[0]', 'Novice');
		fd.set('resultDescription[0].allowedValue[1]', 'Proficient');
		fd.set('resultDescription[0].allowedValue[2]', 'Expert');

		await actions.default(makeEvent(fd));

		expect(mockCreate).toHaveBeenCalledTimes(1);
		const data = mockCreate.mock.calls[0][0].data;

		expect(data.achievementType).toBe('Competency');
		expect(data.image).toBeNull();

		const rds = data.json.resultDescriptions;
		expect(Array.isArray(rds)).toBe(true);
		expect(rds).toHaveLength(1);
		expect(rds[0].id).toMatch(/^urn:uuid:[0-9a-f-]{36}$/);
		expect(rds[0].name).toBe('Proficiency');
		expect(rds[0].type).toEqual(['ResultDescription']);
		expect(rds[0].allowedValue).toEqual(['Novice', 'Proficient', 'Expert']);

		// Existing json keys are preserved alongside the seeded RD.
		expect(data.json.capabilities).toBeDefined();
		expect(data.json).toHaveProperty('claimTemplate');
		expect(data.json).toHaveProperty('reviewsRequired');
	});

	it('rejects an unknown achievementType with a 400', async () => {
		const fd = baseForm();
		fd.set('achievementType', 'NotARealType');

		await expect(actions.default(makeEvent(fd))).rejects.toMatchObject({ status: 400 });
		expect(mockCreate).not.toHaveBeenCalled();
	});

	it('coerces an empty achievementType to null (no column value)', async () => {
		const fd = baseForm();
		fd.set('achievementType', '');

		await actions.default(makeEvent(fd));

		const data = mockCreate.mock.calls[0][0].data;
		expect(data.achievementType).toBeNull();
		expect(data.json.resultDescriptions).toBeUndefined();
	});

	it('leaves categoryId undefined when no category is sent (add-skills picker case)', async () => {
		// The picker omits `category` entirely; an empty string must not become a
		// (nonexistent) categoryId and violate the FK — it should stay unset.
		const fd = baseForm();
		fd.set('achievementType', 'Competency');

		await actions.default(makeEvent(fd));

		const data = mockCreate.mock.calls[0][0].data;
		expect(data.categoryId).toBeUndefined();
	});
});
