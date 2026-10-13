import { describe, expect, it } from 'vitest';

import { deriveExchangeState, isTerminal } from './state';

const T = new Date('2026-10-12T00:00:00.000Z');
const ERR = [{ code: 'proof_invalid', message: 'Bad proof', at: '2026-10-12T00:00:00.000Z' }];

describe('deriveExchangeState', () => {
	it('is pending with no timestamps and no errors', () => {
		expect(deriveExchangeState({ startedAt: null, completedAt: null, errors: null })).toBe(
			'pending'
		);
	});

	it('is active once started', () => {
		expect(deriveExchangeState({ startedAt: T, completedAt: null, errors: null })).toBe('active');
	});

	it('is invalid when errors are recorded, even after start', () => {
		expect(deriveExchangeState({ startedAt: T, completedAt: null, errors: ERR })).toBe('invalid');
		expect(deriveExchangeState({ startedAt: null, completedAt: null, errors: ERR })).toBe(
			'invalid'
		);
	});

	it('is complete when completed, beating errors and start', () => {
		expect(deriveExchangeState({ startedAt: T, completedAt: T, errors: ERR })).toBe('complete');
		expect(deriveExchangeState({ startedAt: null, completedAt: T, errors: null })).toBe('complete');
	});

	it('does not treat an empty errors array as invalid', () => {
		expect(deriveExchangeState({ startedAt: null, completedAt: null, errors: [] })).toBe('pending');
		expect(deriveExchangeState({ startedAt: T, completedAt: null, errors: [] })).toBe('active');
	});

	it('ignores a non-array errors value', () => {
		expect(
			deriveExchangeState({ startedAt: T, completedAt: null, errors: { code: 'x', message: 'y' } })
		).toBe('active');
	});
});

describe('isTerminal', () => {
	it('is true for complete and invalid', () => {
		expect(isTerminal('complete')).toBe(true);
		expect(isTerminal('invalid')).toBe(true);
	});

	it('is false for pending and active', () => {
		expect(isTerminal('pending')).toBe(false);
		expect(isTerminal('active')).toBe(false);
	});
});
