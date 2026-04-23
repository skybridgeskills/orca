export type ExchangeProtocolValue = 'iu' | 'lcw';

export type ExchangeProtocolMessageKey = 'bright_swift_owl_scan' | 'kind_smart_otter_wallet';

export type ExchangeProtocolOption = {
	value: ExchangeProtocolValue;
	messageKey: ExchangeProtocolMessageKey;
	url: string;
};

type ProtocolsInput = {
	iu?: string | null;
	lcw?: string | null;
	// Other fields like vcapi or verifiablePresentationRequest are intentionally ignored.
};

/**
 * Produces the ordered list of protocol choices for the wallet exchange dropdown.
 * Callers use this as the source of truth for which URLs exist and in what order; empty `iu` yields no options so existing “missing interaction URL” handling can run unchanged.
 */
export function buildProtocolOptions(protocols: ProtocolsInput): ExchangeProtocolOption[] {
	const iu = protocols.iu;
	if (iu === undefined || iu === null || iu === '') {
		return [];
	}

	const out: ExchangeProtocolOption[] = [
		{ value: 'iu', messageKey: 'bright_swift_owl_scan', url: iu }
	];

	const lcw = protocols.lcw;
	if (lcw !== undefined && lcw !== null && lcw !== '') {
		out.push({ value: 'lcw', messageKey: 'kind_smart_otter_wallet', url: lcw });
	}

	return out;
}
