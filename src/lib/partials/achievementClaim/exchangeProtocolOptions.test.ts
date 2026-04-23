import { describe, expect, it } from 'vitest';

import { buildProtocolOptions } from './exchangeProtocolOptions';

describe('buildProtocolOptions', () => {
	it('returns iu then lcw when both URLs are present', () => {
		const iu = 'https://example.com/iu';
		const lcw = 'https://example.com/lcw';
		const result = buildProtocolOptions({ iu, lcw });

		expect(result).toEqual([
			{ value: 'iu', messageKey: 'bright_swift_owl_scan', url: iu },
			{ value: 'lcw', messageKey: 'kind_smart_otter_wallet', url: lcw }
		]);
	});

	it('returns only iu when lcw is undefined', () => {
		const iu = 'https://example.com/iu';
		const result = buildProtocolOptions({ iu, lcw: undefined });

		expect(result).toEqual([{ value: 'iu', messageKey: 'bright_swift_owl_scan', url: iu }]);
	});

	it('returns only iu when lcw is the empty string', () => {
		const iu = 'https://example.com/iu';
		const result = buildProtocolOptions({ iu, lcw: '' });

		expect(result).toEqual([{ value: 'iu', messageKey: 'bright_swift_owl_scan', url: iu }]);
	});

	it('returns an empty array when iu is undefined', () => {
		expect(buildProtocolOptions({ iu: undefined, lcw: 'https://example.com/lcw' })).toEqual([]);
	});

	it('ignores extra fields such as vcapi on the input', () => {
		const iu = 'https://example.com/iu';
		const lcw = 'https://example.com/lcw';
		const input = { iu, lcw, vcapi: 'https://example.com/should-be-ignored' } as {
			iu: string;
			lcw: string;
			vcapi: string;
		};

		const result = buildProtocolOptions(input);

		expect(result).toHaveLength(2);
		expect(result.map((o) => o.value)).toEqual(['iu', 'lcw']);
		expect(result[0].url).toBe(iu);
		expect(result[1].url).toBe(lcw);
		expect(result.some((o) => 'vcapi' in o)).toBe(false);
	});
});
