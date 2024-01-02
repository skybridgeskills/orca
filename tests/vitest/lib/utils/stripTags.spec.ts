import { expect, test } from 'vitest';

import stripTags from '$lib/utils/stripTags';

test('undefined returned if nothing passed', () => {
	expect(stripTags()).toEqual('');
});

test('some simple tags stripped', () => {
	expect(stripTags('<strong>foobar</strong>')).toEqual('foobar');
});
