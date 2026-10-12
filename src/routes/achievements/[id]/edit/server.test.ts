import { beforeEach, describe, expect, it, vi } from 'vitest';

// Regression coverage for the edit action's "don't clobber on a plain edit" rules:
// the edit form (AchievementForm) submits neither `achievementType` nor a changed
// image, so a normal edit must preserve both the stored achievementType (e.g. the
// skills picker's 'Competency') and the existing image. Only the IO boundaries
// (prisma, permissions, media) are mocked; the real schema + helpers run.

const mockUpdate = vi.hoisted(() => vi.fn());
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindMany = vi.hoisted(() => vi.fn());
const mockCanEdit = vi.hoisted(() => vi.fn());

vi.mock('../../../../prisma/client', () => ({
	prisma: {
		achievement: { update: mockUpdate, findFirst: mockFindFirst, findFirstOrThrow: vi.fn() },
		user: { findMany: mockUserFindMany },
		achievementCategory: { findMany: vi.fn() }
	}
}));

vi.mock('$lib/server/permissions', () => ({ canEditAchievements: mockCanEdit }));
vi.mock('$lib/server/media', () => ({ getUploadUrl: vi.fn(async () => null) }));

import { actions } from './+page.server';

function makeEvent(formData: FormData) {
	return {
		request: { formData: async () => formData },
		params: { id: 'ach-1' },
		locals: {
			org: { id: 'org-1', json: {} },
			session: { user: { id: 'u1', orgRole: 'ADMIN' } }
		}
	} as unknown as Parameters<typeof actions.default>[0];
}

// Mirrors what AchievementForm actually submits on a plain edit (no achievementType
// field; imageEdited reflects an unchanged image).
function plainEditForm(): FormData {
	const fd = new FormData();
	fd.set('name', 'My competency');
	fd.set('description', 'desc');
	fd.set('imageEdited', 'false');
	fd.set('imageExtension', 'png'); // the form sends this even when unchanged
	return fd;
}

describe('achievements/[id]/edit action: no-clobber on a plain edit', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCanEdit.mockResolvedValue(true);
		mockUserFindMany.mockResolvedValue([]);
		mockFindFirst.mockResolvedValue({ json: {} });
		mockUpdate.mockImplementation(async ({ data }) => ({ id: 'ach-1', ...data }));
	});

	it('does not write achievementType when the field is absent (preserves it)', async () => {
		await actions.default(makeEvent(plainEditForm()));
		const data = mockUpdate.mock.calls[0][0].data;
		expect('achievementType' in data).toBe(false);
	});

	it('does write achievementType when the field is present', async () => {
		const fd = plainEditForm();
		fd.set('achievementType', 'Competency');
		await actions.default(makeEvent(fd));
		const data = mockUpdate.mock.calls[0][0].data;
		expect(data.achievementType).toBe('Competency');
	});

	it('clears achievementType when the field is present but empty', async () => {
		const fd = plainEditForm();
		fd.set('achievementType', '');
		await actions.default(makeEvent(fd));
		const data = mockUpdate.mock.calls[0][0].data;
		expect(data.achievementType).toBeNull();
	});

	it('does not write image when the image is unchanged (preserves it)', async () => {
		await actions.default(makeEvent(plainEditForm()));
		const data = mockUpdate.mock.calls[0][0].data;
		expect('image' in data).toBe(false);
	});
});
