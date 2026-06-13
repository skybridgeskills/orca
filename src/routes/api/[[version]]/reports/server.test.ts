import { beforeEach, describe, expect, it, vi } from 'vitest';

// P2: prove the reports POST endpoint (a) snapshots a SERVER-DERIVED reporter
// status (ANONYMOUS when there is no session), (b) is cross-org safe — a target
// from another org is rejected (404) and no Report is created, and (c) persists
// reason + description after stripTags. Only the IO boundaries (prisma) and the
// reporter-status helper are mocked; the handler's own validation/strip logic runs.

const mockReportCreate = vi.hoisted(() => vi.fn());
const mockAchievementFindFirst = vi.hoisted(() => vi.fn());
const mockClaimFindFirst = vi.hoisted(() => vi.fn());
const mockEndorsementFindFirst = vi.hoisted(() => vi.fn());
const mockComputeReporterStatus = vi.hoisted(() => vi.fn());
const mockNotifyReport = vi.hoisted(() => vi.fn());

vi.mock('$lib/../prisma/client', () => ({
	prisma: {
		report: { create: mockReportCreate },
		achievement: { findFirst: mockAchievementFindFirst },
		achievementClaim: { findFirst: mockClaimFindFirst },
		claimEndorsement: { findFirst: mockEndorsementFindFirst }
	}
}));

vi.mock('$lib/server/moderation/reporterStatus', () => ({
	computeReporterStatus: mockComputeReporterStatus
}));

// The fan-out is exercised in notifyReport.test.ts; here we only assert the endpoint
// wires it after creating the Report (and isolates it from prisma/email IO).
vi.mock('$lib/server/moderation/notifyReport', () => ({ notifyReport: mockNotifyReport }));

import { POST } from './+server';

const ORG = { id: 'org-1', json: {} };

function makeEvent(body: unknown, session: unknown = null) {
	return {
		request: { json: async () => body },
		locals: { org: ORG, session }
	} as unknown as Parameters<typeof POST>[0];
}

describe('reports POST endpoint', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockReportCreate.mockImplementation(async () => ({ id: 'report-1' }));
		// Default: target exists in-org.
		mockAchievementFindFirst.mockResolvedValue({ id: 'ach-1' });
		mockClaimFindFirst.mockResolvedValue({ id: 'claim-1' });
		mockEndorsementFindFirst.mockResolvedValue({ id: 'end-1' });
		mockComputeReporterStatus.mockResolvedValue('ANONYMOUS');
	});

	it('anonymous submit creates a Report with reporterStatus ANONYMOUS and null reporterUserId', async () => {
		const res = await POST(
			makeEvent({
				targetType: 'ACHIEVEMENT',
				targetId: 'ach-1',
				reason: 'SPAM',
				description: 'looks like spam'
			})
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true, reportId: 'report-1' });

		expect(mockReportCreate).toHaveBeenCalledTimes(1);
		const data = mockReportCreate.mock.calls[0][0].data;
		expect(data.reporterStatus).toBe('ANONYMOUS');
		expect(data.reporterUserId).toBeNull();
		expect(data.originOrgId).toBe('org-1');
		expect(data.targetType).toBe('ACHIEVEMENT');
		expect(data.targetId).toBe('ach-1');

		// Wires the fan-out after creating the Report, passing origin org = locals.org.
		expect(mockNotifyReport).toHaveBeenCalledTimes(1);
		expect(mockNotifyReport.mock.calls[0][0]).toMatchObject({
			report: { id: 'report-1' },
			originOrg: ORG
		});
	});

	it('derives reporterUserId from the session and never trusts client-supplied identity', async () => {
		mockComputeReporterStatus.mockResolvedValue('MEMBER');
		const res = await POST(
			makeEvent(
				{
					targetType: 'CLAIM',
					targetId: 'claim-1',
					reason: 'ABUSE',
					// Hostile client trying to spoof reporter identity/status — must be ignored.
					reporterStatus: 'ADMIN',
					reporterUserId: 'someone-else',
					originOrgId: 'evil-org'
				},
				{ user: { id: 'user-9' } }
			)
		);

		expect(res.status).toBe(200);
		const data = mockReportCreate.mock.calls[0][0].data;
		expect(data.reporterStatus).toBe('MEMBER');
		expect(data.reporterUserId).toBe('user-9');
		expect(data.originOrgId).toBe('org-1');
	});

	it('rejects a target from another org with a 404 and creates no Report', async () => {
		// Org-scoped lookup finds nothing (target belongs to another org).
		mockAchievementFindFirst.mockResolvedValue(null);

		await expect(
			POST(
				makeEvent({
					targetType: 'ACHIEVEMENT',
					targetId: 'foreign-ach',
					reason: 'SPAM'
				})
			)
		).rejects.toMatchObject({ status: 404 });

		expect(mockReportCreate).not.toHaveBeenCalled();
	});

	it('rejects an invalid targetType with a 400', async () => {
		await expect(
			POST(makeEvent({ targetType: 'NOT_A_TYPE', targetId: 'x', reason: 'SPAM' }))
		).rejects.toMatchObject({ status: 400 });
		expect(mockReportCreate).not.toHaveBeenCalled();
	});

	it('strips tags from reason and description before persisting', async () => {
		await POST(
			makeEvent({
				targetType: 'ENDORSEMENT',
				targetId: 'end-1',
				reason: '<b>SPAM</b>',
				description: '<script>alert(1)</script>nasty'
			})
		);

		const data = mockReportCreate.mock.calls[0][0].data;
		expect(data.reason).toBe('SPAM');
		expect(data.description).toBe('nasty');
	});

	it('stores null description when none is provided', async () => {
		await POST(makeEvent({ targetType: 'CLAIM', targetId: 'claim-1', reason: 'OTHER' }));
		const data = mockReportCreate.mock.calls[0][0].data;
		expect(data.description).toBeNull();
	});
});
