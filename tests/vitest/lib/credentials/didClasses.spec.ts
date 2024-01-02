import { expect, test, vi } from 'vitest';

import {
	CredentialSubjectDID,
	DID,
	DID_METHODS,
	OrganizationDID,
	KeyDID
} from '$lib/credentials/did';
import { testSigningKey, testOrganization, testUser } from '../../testObjects';

const orgWithPort = {
	...testOrganization,
	domain: `${testOrganization.domain}:1234`
};

test('DID class properly encodes port marker in method specific identifier', async () => {
	const testDid = new DID(DID_METHODS.WEB, 'example.com:1234', 'pathPart1');
	expect(testDid.didString()).toEqual('did:web:example.com%3A1234:pathPart1');
});

test('DID class properly separates path parts with colon', async () => {
	const testDid = new DID(DID_METHODS.WEB, 'example.com', 'pathPart1/pathPart2');
	expect(testDid.didString()).toEqual('did:web:example.com:pathPart1:pathPart2');
});

test('DID class properly encodes query string parameters', async () => {
	const testDid = new DID(
		DID_METHODS.WEB,
		'example.com',
		'pathPart1',
		'param1=val?e1&param:=value2'
	);
	expect(testDid.didString()).toEqual(
		'did:web:example.com:pathPart1?param1=val%3Fe1&param%3A=value2'
	);
});

test('DID class properly handles an equals sign in query string parameter values', async () => {
	const testDid = new DID(
		DID_METHODS.WEB,
		'example.com',
		'pathPart1',
		'param1=va==l?e1&param:=value=2'
	);
	expect(testDid.didString()).toEqual(
		'did:web:example.com:pathPart1?param1=va%3D%3Dl%3Fe1&param%3A=value%3D2'
	);
});

test('DID class properly attaches fragment with query parameters', async () => {
	const testDid = new DID(
		DID_METHODS.WEB,
		'example.com',
		'pathPart1',
		'param1=val?e1&param:=value2',
		'fragment1'
	);
	expect(testDid.didString()).toEqual(
		'did:web:example.com:pathPart1?param1=val%3Fe1&param%3A=value2#fragment1'
	);
});

test('DID class properly attaches fragment without query parameters', async () => {
	const testDid = new DID(DID_METHODS.WEB, 'example.com:1234', 'pathPart1', '', 'fragment1');
	expect(testDid.didString()).toEqual('did:web:example.com%3A1234:pathPart1#fragment1');
});

test('CredentialSubjectDID class properly created did string', async () => {
	const credentialSubjectDid = new CredentialSubjectDID(testOrganization, testUser);

	expect(credentialSubjectDid.didString()).toEqual('did:web:example.com:u:dGVzdC11c2VyLWlk');

	const codedId = credentialSubjectDid.didString().split(':').slice(-1)[0];

	expect(Buffer.from(codedId, 'base64url').toString()).toEqual(testUser.id);
});

test('KeyDID class properly created did string', async () => {
	const signingKeyDid = new KeyDID(testOrganization, testSigningKey);
	expect(signingKeyDid.didString()).toEqual('did:web:example.com#key-0');

	const signingKeyDidWithPort = new KeyDID(orgWithPort, testSigningKey);
	expect(signingKeyDidWithPort.didString()).toEqual('did:web:example.com%3A1234#key-0');
});

test('OrganizationDID class properly created did string', async () => {
	const orgDidNoPort = new OrganizationDID(testOrganization);
	expect(orgDidNoPort.didString()).toEqual('did:web:example.com');

	const orgDidWithPort = new OrganizationDID(orgWithPort);
	expect(orgDidWithPort.didString()).toEqual('did:web:example.com%3A1234');
});
