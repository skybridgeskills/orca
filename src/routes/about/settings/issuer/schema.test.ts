import { describe, it, expect } from 'vitest';
import { setIssuerSchema, setTransactionServiceSchema } from './schema';

describe('setIssuerSchema', () => {
	it('accepts signingKey with signingKeyId', async () => {
		await expect(
			setIssuerSchema.validate({ type: 'signingKey', signingKeyId: 'k1' })
		).resolves.toEqual({ type: 'signingKey', signingKeyId: 'k1' });
	});

	it('rejects signingKey without signingKeyId', async () => {
		await expect(setIssuerSchema.validate({ type: 'signingKey' })).rejects.toBeTruthy();
	});

	it('accepts transactionService without signingKeyId', async () => {
		await expect(setIssuerSchema.validate({ type: 'transactionService' })).resolves.toEqual({
			type: 'transactionService'
		});
	});

	it('rejects invalid type', async () => {
		await expect(setIssuerSchema.validate({ type: 'foo', signingKeyId: 'x' })).rejects.toBeTruthy();
	});
});

describe('setTransactionServiceSchema', () => {
	it('accepts url and tenantName', async () => {
		await expect(
			setTransactionServiceSchema.validate({ url: 'https://x', tenantName: 'a' })
		).resolves.toEqual({ url: 'https://x', tenantName: 'a' });
	});

	it('rejects missing url', async () => {
		await expect(
			setTransactionServiceSchema.validate({ tenantName: 'a' } as {
				url?: string;
				tenantName: string;
			})
		).rejects.toBeTruthy();
	});

	it('rejects tenantName with whitespace', async () => {
		await expect(
			setTransactionServiceSchema.validate({ url: 'https://x', tenantName: 'has space' })
		).rejects.toBeTruthy();
	});

	it('rejects non-http(s) url', async () => {
		await expect(
			setTransactionServiceSchema.validate({ url: 'ftp://x', tenantName: 'a' })
		).rejects.toBeTruthy();
	});

	it('allows optional apiKey (blank and present)', async () => {
		await expect(
			setTransactionServiceSchema.validate({ url: 'https://x', tenantName: 'a', apiKey: '' })
		).resolves.toBeTruthy();
		await expect(
			setTransactionServiceSchema.validate({ url: 'https://x', tenantName: 'a', apiKey: 'secret' })
		).resolves.toBeTruthy();
	});
});
