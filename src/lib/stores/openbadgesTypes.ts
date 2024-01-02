export interface Alignment {
	type: string;
	targetCode?: string;
	targetDescription?: string;
	targetName: string;
	targetFramework?: string;
	targetType?: string;
	targetUrl: string;
}

export interface Criteria {
	id?: string;
	narrative?: string;
}

export interface BadgeImage {
	id: string;
	type: string;
	caption?: string;
}

export interface IdentifierEntry {
	type: Array<string>;
	identifier: string;
	identifierType: string;
}

export interface RelatedEntry {
	id: string;
	'@language'?: string;
	version?: string;
}

export interface RubricCriterionLevel {
	id: string;
	type: Array<string>;
	alignment?: Array<Alignment>;
	description?: string;
	level?: string;
	name: string;
	points?: string;
}

export interface ResultDescription {
	id: string;
	type: Array<string>;
	alignment?: Array<Alignment>;
	allowedValue: Array<string>;
	name: string;
	requiredLevel?: string;
	resultType: string;
	rubricCriterionLevel?: Array<RubricCriterionLevel>;
	valueMin?: string;
	valueMax?: string;
}

export interface GeoCoordinates {
	type: Array<string>;
	latitude: number;
	longitude: number;
}

export interface StreetAddressDescriptor {
	type: Array<string>;
	addressCountry?: string;
	addressCountryCode?: string;
	addressRegion?: string;
	addressLocality?: string;
	streetAddress?: string;
	postOfficeBoxNumber?: string;
	postalCode?: string;
	geo?: GeoCoordinates;
}

export interface Profile {
	id: string;
	type: Array<string>;
	name?: string;
	url?: string;
	phone?: string;
	description?: string;
	image?: BadgeImage;
	email?: string;
	address?: StreetAddressDescriptor;
	otherIdentifier?: Array<IdentifierEntry>;
	official?: string;
	parentOrg?: Profile;
	familyName?: string;
	givenName?: string;
	additionalName?: string;
	patronymicName?: string;
	honorificPrefix?: string;
	honorificSuffix?: string;
	familyNamePrefix?: string;
	dateofBirth?: string;
}

export interface Achievement {
	id: string;
	type: Array<string>;
	name: string;
	criteria: Criteria;
	description: string;

	creator?: Profile;
	image?: BadgeImage;
	achievementType?: string;
	fieldOfStudy?: string;
	humanCode?: string;
	specialization?: string;
	tag?: Array<string>;
	version?: string;
	'@language'?: string;
	otherIdentifier?: Array<IdentifierEntry>;
	related?: Array<RelatedEntry>;
	resultDescription?: Array<ResultDescription>;
}
