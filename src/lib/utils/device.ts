type NavigatorLike = Pick<Navigator, 'userAgent' | 'maxTouchPoints'> & {
	userAgentData?: { mobile?: boolean };
};

/**
 * Best-effort check for a phone or tablet: the visitor is already on the device a
 * wallet app would run on, so a QR code for cross-device handoff is rarely useful.
 */
export function isMobileDevice(nav: NavigatorLike | undefined = globalThis.navigator): boolean {
	if (!nav) return false;
	if (typeof nav.userAgentData?.mobile === 'boolean') return nav.userAgentData.mobile;
	if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent)) return true;
	// iPadOS reports a desktop Safari user agent; touch support gives it away.
	return /Macintosh/.test(nav.userAgent) && nav.maxTouchPoints > 1;
}
