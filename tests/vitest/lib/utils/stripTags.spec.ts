import { expect, test } from 'vitest';

import stripTags from '$lib/utils/stripTags';

test('Empty string returned if nothing passed', () => {
	expect(stripTags()).toEqual('');
});

test('some simple tags stripped', () => {
	expect(stripTags('<strong>foobar</strong>')).toEqual('foobar');
});
