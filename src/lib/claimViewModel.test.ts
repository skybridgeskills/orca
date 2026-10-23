import type { ClaimStatus, Visibility } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { claimActions, type IssuerMode, type ViewerRole } from './claimViewModel';

const STATUSES: ClaimStatus[] = ['UNACCEPTED', 'ACCEPTED', 'REJECTED'];
const NON_OWNERS: ViewerRole[] = ['admin', 'community', 'public'];
const ISSUER_MODES: IssuerMode[] = ['local', 'transactionService'];

describe('claimActions', () => {
	it('gives non-owner viewers no actions, whatever the status or visibility', () => {
		for (const viewer of NON_OWNERS) {
			for (const status of STATUSES) {
				for (const issuerMode of ISSUER_MODES) {
					expect(claimActions(status, viewer, issuerMode, 'PUBLIC')).toEqual({
						manage: [],
						share: []
					});
				}
			}
		}
	});

	it('owner UNACCEPTED and REJECTED lists are unchanged by visibility', () => {
		for (const visibility of ['PUBLIC', 'PRIVATE'] as Visibility[]) {
			expect(claimActions('UNACCEPTED', 'owner', 'local', visibility)).toEqual({
				manage: ['rejectClaim', 'editClaim'],
				share: []
			});
			expect(claimActions('REJECTED', 'owner', 'local', visibility)).toEqual({
				manage: ['editClaim'],
				share: []
			});
		}
	});

	it('owner ACCEPTED + PUBLIC offers the share actions', () => {
		expect(claimActions('ACCEPTED', 'owner', 'local', 'PUBLIC')).toEqual({
			manage: ['download', 'exchange', 'editClaim', 'rejectClaim'],
			share: ['copyLink', 'shareQr', 'shareLinkedin']
		});
		expect(claimActions('ACCEPTED', 'owner', 'transactionService', 'PUBLIC')).toEqual({
			manage: ['exchange', 'editClaim', 'rejectClaim'],
			share: ['copyLink', 'shareLinkedin']
		});
	});

	for (const visibility of ['COMMUNITY', 'PRIVATE', 'ACHIEVEMENT'] as Visibility[]) {
		it(`owner ACCEPTED + ${visibility} offers no share actions; manage is unchanged`, () => {
			expect(claimActions('ACCEPTED', 'owner', 'local', visibility)).toEqual({
				manage: ['download', 'exchange', 'editClaim', 'rejectClaim'],
				share: []
			});
			expect(claimActions('ACCEPTED', 'owner', 'transactionService', visibility)).toEqual({
				manage: ['exchange', 'editClaim', 'rejectClaim'],
				share: []
			});
		});
	}
});
