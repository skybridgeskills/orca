import type { ClaimStatus } from '@prisma/client';

/**
 * Viewer's role relative to a single claim. The authoritative computation lives
 * server-side in `$lib/server/claimVisibility.ts` (`viewerRole`); this type is
 * declared here, in a client-safe module, so both the server helper and the
 * client-side `ClaimDetail` view-model can share it without pulling a
 * `$lib/server` import into the browser bundle.
 */
export type ViewerRole = 'owner' | 'admin' | 'community' | 'public';

/**
 * Identifiers for the discrete affordances a claim detail can expose. The
 * `ClaimDetail` component renders a `ClaimActionBar` from a derived list of
 * these rather than hand-writing per-status button blocks.
 *
 * - `editClaim`   – open the claim form with intent ACCEPTED (claim / edit / re-accept)
 * - `rejectClaim` – open the claim form with intent REJECTED
 * - `download`    – download the verifiable credential JSON
 * - `sendToWallet`– CHAPI send-to-wallet (non-exchange orgs)
 * - `exchange`    – transaction-service wallet handoff (exchange-enabled orgs)
 * - `copyLink`    – copy the public OB2 URL to the clipboard
 * - `shareQr`     – show the QR-code share modal (non-exchange orgs)
 * - `shareLinkedin` – LinkedIn "add to profile" link
 */
export type ClaimActionId =
	| 'editClaim'
	| 'rejectClaim'
	| 'download'
	| 'sendToWallet'
	| 'exchange'
	| 'copyLink'
	| 'shareQr'
	| 'shareLinkedin';

/**
 * A render-ready action descriptor. `ClaimDetail` maps each derived
 * `ClaimActionId` to one of these (resolving copy, button role, and the
 * handler/href/download wiring), and `ClaimActionBar` renders the list without
 * knowing anything status- or viewer-specific.
 */
export interface ClaimActionDescriptor {
	id: ClaimActionId;
	label: string;
	submodule: 'primary' | 'secondary' | 'danger';
	/** Click handler (mutually exclusive with `href`). */
	onclick?: (e: MouseEvent | KeyboardEvent) => void;
	/** External/internal link target (used by `shareLinkedin`). */
	href?: string;
	/** When set, render a download button that POSTs to this URL. */
	downloadUrl?: string;
	/** Suggested filename for a download action. */
	downloadFileName?: string;
	/** Optional id passed through to the rendered control. */
	controlId?: string;
	/** Disable the control. */
	disabled?: boolean;
	/** Extra attributes for link-style actions (e.g. LinkedIn target/rel). */
	moreProps?: Record<string, unknown>;
}

export interface ClaimActionsView {
	/** Primary accept/reject/edit actions (rendered near the claim status). */
	manage: ClaimActionId[];
	/** Share/download affordances (rendered in the "share this badge" bar). */
	share: ClaimActionId[];
}

/**
 * Pure view-model: derive the set of allowed actions from
 * (claimStatus, viewerRole, exchangeEnabled).
 *
 * Behavior-preservation note (P3): in the pre-refactor UI, accept / reject /
 * edit / download / share were ONLY ever shown to the badge owner. Admins,
 * community members and the public never saw action buttons on the claim body
 * (admins/community could still endorse, but that lives in the route, not here).
 * This helper preserves that exactly: every list is empty unless `viewer` is
 * `'owner'`. Do not broaden this without explicit approval (it would invent new
 * exposure — see the P3 directive).
 */
export function claimActions(
	claimStatus: ClaimStatus,
	viewer: ViewerRole,
	exchangeEnabled: boolean
): ClaimActionsView {
	const empty: ClaimActionsView = { manage: [], share: [] };
	if (viewer !== 'owner') return empty;

	switch (claimStatus) {
		case 'UNACCEPTED': {
			// UnacceptedClaimDetail: reject (danger) + accept.
			return { manage: ['rejectClaim', 'editClaim'], share: [] };
		}
		case 'ACCEPTED': {
			// AcceptedClaimDetail: download/sendToWallet (or exchange) + edit + reject,
			// plus a share bar (copyLink, QR [non-exchange only], LinkedIn).
			const manage: ClaimActionId[] = exchangeEnabled
				? ['exchange', 'editClaim', 'rejectClaim']
				: ['download', 'sendToWallet', 'editClaim', 'rejectClaim'];
			const share: ClaimActionId[] = exchangeEnabled
				? ['copyLink', 'shareLinkedin']
				: ['copyLink', 'shareQr', 'shareLinkedin'];
			return { manage, share };
		}
		case 'REJECTED': {
			// RejectedClaimDetail: a single "Change acceptance" button → re-accept.
			return { manage: ['editClaim'], share: [] };
		}
		default:
			return empty;
	}
}
