import type { Organization, SigningKey, User } from '@prisma/client';

export const DID_METHODS = {
	WEB: 'web'
};

export type DID_METHODS = (typeof DID_METHODS)[keyof typeof DID_METHODS];

export class DID {
	private prefix = 'did';
	protected method: string;
	protected methodSpecificId: string;
	protected path: string;
	protected query: string;
	protected fragment: string;

	constructor(
		method: DID_METHODS,
		methodSpecificId: string,
		path: string = '',
		query: string = '',
		fragment: string = ''
	) {
		this.method = method;
		this.methodSpecificId = methodSpecificId;
		this.path = path;
		this.query = query;
		this.fragment = fragment;
	}

	didString = (): string => {
		let did = `${this.prefix}:${this.method}:${encodeURIComponent(this.methodSpecificId)}`;
		if (this.path) {
			did = `${did}:${this.path.replaceAll('/', ':')}`;
		}
		if (this.query) {
			const encodedQuery = new URLSearchParams(this.query);
			did = `${did}?${encodedQuery}`;
		}
		if (this.fragment) {
			did = `${did}#${this.fragment}`;
		}
		return did;
	};
}

export class CredentialSubjectDID extends DID {
	constructor(
		public organization: Organization,
		public user: User
	) {
		super(DID_METHODS.WEB, organization.domain, `u/${Buffer.from(user.id).toString('base64url')}`);
	}
}

export class OrganizationDID extends DID {
	constructor(public organization: Organization) {
		super(DID_METHODS.WEB, organization.domain);
	}
}

export class KeyDID extends DID {
	constructor(
		public organization: Organization,
		public key: SigningKey
	) {
		super(DID_METHODS.WEB, organization.domain, '', '', 'key-0');
	}
}
