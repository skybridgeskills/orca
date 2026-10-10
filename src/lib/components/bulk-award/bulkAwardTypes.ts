export type BulkAwardRow = {
	email: string;
	narrative: string;
	evidenceUrl: string;
};

export type BulkAwardRowStatusValue =
	| 'pending'
	| 'processing'
	| 'success_new'
	| 'success_existing'
	| 'error';

export type BulkAwardRowStatus = {
	status: BulkAwardRowStatusValue;
	created?: boolean;
	invited?: boolean;
	claimId?: string;
	endorsementId?: string;
	detailHref?: string;
	error?: string;
	processedAt?: string;
};

export type BulkAwardApiMeta = {
	created?: boolean;
	invited?: boolean;
	claimId?: string | null;
	endorsementId?: string | null;
};
