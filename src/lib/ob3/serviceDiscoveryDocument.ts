import { PUBLIC_HTTP_PROTOCOL } from '$env/static/public';
import type { Organization } from '@prisma/client';

/**
 * Open Badges 3.0 Service Discovery Document
 * Adapted from https://purl.imsglobal.org/spec/ob/v3p0/schema/openapi/ob_v3p0_oas.json
 * Used in compliance with the IMS Global Specification Document License
 */
export const DEFAULT_SCOPES = {
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.readonly':
		'Permission to read AchievementCredentials for the authenticated entity.',
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.upsert':
		'Permission to create or update AchievementCredentials for the authenticated entity.',
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/profile.readonly':
		'Permission to read the profile for the authenticated entity.',
	'https://purl.imsglobal.org/spec/ob/v3p0/scope/profile.update':
		'Permission to update the profile for the authenticated entity.'
};

const SERVICE_DISCOVERY_DOCUMENT = {
	openapi: '3.0.1',
	info: {
		title: 'OpenAPI schema for Open Badges',
		description: 'Open Badges Data Model 3.0',
		termsOfService: 'https://www.imsglobal.org/license.html',
		contact: {
			name: 'IMS Global',
			url: 'https://www.imsglobal.org',
			email: 'support@imsglobal.org'
		},
		license: {
			name: 'IMS Global Specification Document License',
			url: 'https://www.imsglobal.org/license.html'
		},
		version: '3.0',
		'x-status': 'Candidate Final',
		'x-model-pid': 'org.1edtech.ob.v3p0.model',
		'x-service-pid': 'org.1edtech.ob.v3p0.rest.servicemodel',
		'x-src-operation-count': 5,
		'x-oas-operation-count': 5
	},
	servers: [
		{
			url: 'https://example.org/ims/ob/v3p0',
			description: 'The above Server URL should be changed to the actual server location.'
		}
	],
	tags: [
		{
			name: 'OpenBadgeCredentials',
			description:
				'These endpoints are used to exchange OpenBadgeCredentials and Profile information.'
		},
		{
			name: 'Discovery'
		}
	],
	paths: {
		'/credentials': {
			get: {
				tags: ['OpenBadgeCredentials'],
				summary: 'The REST GET operation for the getCredentials() API call.',
				description:
					'Get issued OpenBadgeCredentials from the [=resource server=] for the supplied parameters and access token.',
				operationId: 'getCredentials',
				parameters: [
					{
						name: 'limit',
						in: 'query',
						description: 'The maximum number of OpenBadgeCredentials to return per page.',
						required: false,
						allowEmptyValue: false,
						style: 'form',
						schema: {
							minimum: 1,
							type: 'integer',
							format: 'int32'
						}
					},
					{
						name: 'offset',
						in: 'query',
						description: 'The index of the first AchievementCredential to return. (zero indexed)',
						required: false,
						allowEmptyValue: false,
						style: 'form',
						schema: {
							minimum: 0,
							type: 'integer',
							format: 'int32'
						}
					},
					{
						name: 'since',
						in: 'query',
						description: 'Only include OpenBadgeCredentials issued after this timestamp.',
						required: false,
						allowEmptyValue: false,
						style: 'form',
						schema: {
							type: 'string',
							description: 'An [[ISO8601]] time using the syntax YYYY-MM-DDThh:mm:ss.',
							format: 'date-time'
						}
					}
				],
				responses: {
					'200': {
						description:
							'The set of OpenBadgeCredentials that meet the request parameters. Paging applies to the total number of OpenBadgeCredentials in the response.',
						headers: {
							'X-Total-Count': {
								$ref: '#/components/headers/X-Total-Count'
							}
						},
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/GetOpenBadgeCredentialsResponse'
								}
							}
						},
						links: {
							next: {
								$ref: '#/components/links/next'
							},
							last: {
								$ref: '#/components/links/last'
							},
							first: {
								$ref: '#/components/links/first'
							},
							prev: {
								$ref: '#/components/links/prev'
							}
						}
					},
					'400': {
						description:
							'As defined in [[rfc9110]], indicating that the server cannot or will not process the request due to something that is perceived to be a client error.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'401': {
						description:
							'As defined in [[rfc9110]], indicating that the request has not been applied because it lacks valid authentication credentials for the target resource.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'403': {
						description:
							'As defined in [[rfc9110]], indicating that the server understood the request but refuses to fulfill it. The exact reason SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'405': {
						description:
							'As defined in [[rfc9110]], indicating that the server does not allow the method.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'500': {
						description:
							'As defined in [[rfc9110]]. Implementations SHOULD avoid using this error code - use only if there is catastrophic error and there is not a more appropriate code.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					default: {
						description:
							'The request was invalid or cannot be served. The exact error SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					}
				},
				security: [
					{
						OAuth2ACG: ['https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.readonly']
					}
				],
				'x-operation-pid': 'org.1edtech.ob.v3p0.rest.getcredentials.operation'
			},
			post: {
				tags: ['OpenBadgeCredentials'],
				summary: 'The REST POST operation for the upsertCredential() API call.',
				description:
					'Create or replace an AchievementCredential on the [=resource server=], appending it to the list of credentials for the subject, or replacing an existing entry in that list. The [=resource server=] SHOULD use the [=credential equality and comparison=] algorithm to compare and determine initial equality. The response code makes clear whether the operation resulted in a replacement or an insertion.',
				operationId: 'upsertCredential',
				requestBody: {
					description: 'The request body for the upsertCredential operation.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/AchievementCredential'
							}
						},
						'text/plain': {
							schema: {
								pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
								type: 'string',
								description: 'A `String` in Compact JWS format [[RFC7515]].'
							}
						}
					},
					required: true
				},
				responses: {
					'200': {
						description:
							'The AchievementCredential was successfully replaced on the [=resource server=]. The response body MUST be the AchievementCredential in the request.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/AchievementCredential'
								}
							},
							'text/plain': {
								schema: {
									pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
									type: 'string',
									description: 'A `String` in Compact JWS format [[RFC7515]].'
								}
							}
						}
					},
					'201': {
						description:
							'The AchievementCredential was successfully created on the [=resource server=]. The response body MUST be the AchievementCredential in the request.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/AchievementCredential'
								}
							},
							'text/plain': {
								schema: {
									pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
									type: 'string',
									description: 'A `String` in Compact JWS format [[RFC7515]].'
								}
							}
						}
					},
					'304': {
						description:
							'As defined in [[rfc9110]], indicating that there is no need for the server to transfer a representation of the target resource because the request indicates that the client, which made the request conditional, already has a valid representation.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'400': {
						description:
							'As defined in [[rfc9110]], indicating that the server cannot or will not process the request due to something that is perceived to be a client error.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'401': {
						description:
							'As defined in [[rfc9110]], indicating that the request has not been applied because it lacks valid authentication credentials for the target resource.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'403': {
						description:
							'As defined in [[rfc9110]], indicating that the server understood the request but refuses to fulfill it. The exact reason SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'404': {
						description:
							'As defined in [[rfc9110]], indicating that the origin server did not find a current representation for the target resource or is not willing to disclose that one exists.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'405': {
						description:
							'As defined in [[rfc9110]], indicating that the server does not allow the method.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'500': {
						description:
							'As defined in [[rfc9110]]. Implementations SHOULD avoid using this error code - use only if there is catastrophic error and there is not a more appropriate code.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					default: {
						description:
							'The request was invalid or cannot be served. The exact error SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					}
				},
				security: [
					{
						OAuth2ACG: ['https://purl.imsglobal.org/spec/ob/v3p0/scope/credential.upsert']
					}
				],
				'x-operation-pid': 'org.1edtech.ob.v3p0.rest.upsertcredential.operation'
			}
		},
		'/profile': {
			get: {
				tags: ['OpenBadgeCredentials'],
				summary: 'The REST GET operation for the getProfile() API call.',
				description:
					'Fetch the profile from the [=resource server=] for the supplied access token. Profiles that are received MAY contain attributes that a Host SHOULD authenticate before using in practice.',
				operationId: 'getProfile',
				responses: {
					'200': {
						description: 'The 200 (OK) response to the getProfile() API call.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Profile'
								}
							}
						}
					},
					'404': {
						description:
							'As defined in [[rfc9110]], indicating that the origin server did not find a current representation for the target resource or is not willing to disclose that one exists.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'400': {
						description:
							'As defined in [[rfc9110]], indicating that the server cannot or will not process the request due to something that is perceived to be a client error.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'401': {
						description:
							'As defined in [[rfc9110]], indicating that the request has not been applied because it lacks valid authentication credentials for the target resource.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'403': {
						description:
							'As defined in [[rfc9110]], indicating that the server understood the request but refuses to fulfill it. The exact reason SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'405': {
						description:
							'As defined in [[rfc9110]], indicating that the server does not allow the method.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'500': {
						description:
							'As defined in [[rfc9110]]. Implementations SHOULD avoid using this error code - use only if there is catastrophic error and there is not a more appropriate code.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					default: {
						description:
							'The request was invalid or cannot be served. The exact error SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					}
				},
				security: [
					{
						OAuth2ACG: ['https://purl.imsglobal.org/spec/ob/v3p0/scope/profile.readonly']
					}
				],
				'x-operation-pid': 'org.1edtech.ob.v3p0.rest.getprofile.operation'
			},
			put: {
				tags: ['OpenBadgeCredentials'],
				summary: 'The REST PUT operation for the putProfile() API call.',
				description: 'Update the profile for the authenticate entity.',
				operationId: 'putProfile',
				requestBody: {
					description: 'The request body for the putProfile operation.',
					content: {
						'application/json': {
							schema: {
								$ref: '#/components/schemas/Profile'
							}
						}
					},
					required: true
				},
				responses: {
					'200': {
						description: 'The 200 (OK) response to the putProfile() API call.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Profile'
								}
							}
						}
					},
					'202': {
						description:
							'As defined in [[rfc9110]], indicating that the request has been accepted for processing, but the processing has not been completed.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'304': {
						description:
							'As defined in [[rfc9110]], indicating that there is no need for the server to transfer a representation of the target resource because the request indicates that the client, which made the request conditional, already has a valid representation.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'400': {
						description:
							'As defined in [[rfc9110]], indicating that the server cannot or will not process the request due to something that is perceived to be a client error.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'401': {
						description:
							'As defined in [[rfc9110]], indicating that the request has not been applied because it lacks valid authentication credentials for the target resource.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'403': {
						description:
							'As defined in [[rfc9110]], indicating that the server understood the request but refuses to fulfill it. The exact reason SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'404': {
						description:
							'As defined in [[rfc9110]], indicating that the origin server did not find a current representation for the target resource or is not willing to disclose that one exists.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'405': {
						description:
							'As defined in [[rfc9110]], indicating that the server does not allow the method.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					'500': {
						description:
							'As defined in [[rfc9110]]. Implementations SHOULD avoid using this error code - use only if there is catastrophic error and there is not a more appropriate code.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					},
					default: {
						description:
							'The request was invalid or cannot be served. The exact error SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					}
				},
				security: [
					{
						OAuth2ACG: ['https://purl.imsglobal.org/spec/ob/v3p0/scope/profile.update']
					}
				],
				'x-operation-pid': 'org.1edtech.ob.v3p0.rest.putprofile.operation'
			}
		},
		'/discovery': {
			get: {
				tags: ['Discovery'],
				summary: 'The REST GET operation for the getServiceDescription() API call.',
				description: 'Fetch the Service Description Document from the [=resource server=].',
				operationId: 'getServiceDescription',
				responses: {
					'200': {
						description: 'The 200 (OK) response to the getServiceDescription() API call.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/ServiceDescriptionDocument'
								}
							}
						}
					},
					default: {
						description:
							'The request was invalid or cannot be served. The exact error SHOULD be explained in the response payload.',
						content: {
							'application/json': {
								schema: {
									$ref: '#/components/schemas/Imsx_StatusInfo'
								}
							}
						}
					}
				},
				'x-operation-pid': 'org.1edtech.ob.v3p0.rest.getservicedescription.operation'
			}
		}
	},
	components: {
		schemas: {
			Address: {
				required: ['type'],
				type: 'object',
				properties: {
					addressCountry: {
						type: 'string',
						description: 'A country.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					geo: {
						$ref: '#/components/schemas/GeoCoordinates'
					},
					addressCountryCode: {
						type: 'string',
						description:
							'A country code. The value must be a ISO 3166-1 alpha-2 country code [[ISO3166-1]].',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.countrycode.class'
					},
					streetAddress: {
						type: 'string',
						description: 'A street address within the locality.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					postalCode: {
						type: 'string',
						description: 'A postal code.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					addressLocality: {
						type: 'string',
						description: 'A locality within the region.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Address'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					addressRegion: {
						type: 'string',
						description: 'A region within the country.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					postOfficeBoxNumber: {
						type: 'string',
						description: 'A post office box number for PO box addresses.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'An address for the described entity.',
				'x-class-pid': 'org.1edtech.ob.v3p0.address.class'
			},
			CredentialSchema: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description:
							'The value MUST be a URI identifying the schema file. One instance of `CredentialSchema` MUST have an `id` that is the URL of the JSON Schema for this credential defined by this specification.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						type: 'string',
						description:
							"The value MUST identify the type of data schema validation. One instance of `CredentialSchema` MUST have a `type` of 'JsonSchemaValidator2019'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description: 'Identify the type and location of a data schema.',
				'x-class-pid': 'org.1edtech.ob.v3p0.credentialschema.class'
			},
			OpenApiSecuritySchemes: {
				type: 'object',
				properties: {
					OAuth2ACG: {
						$ref: '#/components/schemas/OpenApiOAuth2SecurityScheme'
					}
				},
				additionalProperties: false,
				description: 'The Map of security scheme objects supported by this specification.',
				'x-class-pid': 'org.1edtech.ob.v3p0.openapisecurityschemes.class'
			},
			Criteria: {
				type: 'object',
				properties: {
					narrative: {
						type: 'string',
						description:
							'A narrative of what is needed to earn the achievement. Markdown is allowed.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.markdown.class'
					},
					id: {
						type: 'string',
						description:
							'The URI of a webpage that describes in a human-readable format the criteria for the achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					}
				},
				additionalProperties: true,
				description:
					'Descriptive metadata about the achievements necessary to be recognized with an assertion of a particular achievement. This data is added to the Achievement class so that it may be rendered when the achievement assertion is displayed, instead of simply a link to human-readable criteria external to the achievement. Embedding criteria allows either enhancement of an external criteria page or increased portability and ease of use by allowing issuers to skip hosting the formerly-required external criteria page altogether. Criteria is used to allow would-be recipients to learn what is required of them to be recognized with an assertion of a particular achievement. It is also used after the assertion is awarded to a recipient to let those inspecting earned achievements know the general requirements that the recipients met in order to earn it.',
				'x-class-pid': 'org.1edtech.ob.v3p0.criteria.class'
			},
			OpenApiComponents: {
				required: ['securitySchemes'],
				type: 'object',
				properties: {
					securitySchemes: {
						$ref: '#/components/schemas/OpenApiSecuritySchemes'
					}
				},
				additionalProperties: true,
				description:
					'Holds a set of reusable objects for different aspects of the OAS. All objects defined within the components object will have no effect on the API unless they are explicitly referenced from properties outside the components object.',
				'x-class-pid': 'org.1edtech.ob.v3p0.openapicomponents.class'
			},
			Image: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					caption: {
						type: 'string',
						description: 'The caption for the image.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description: 'The URI or Data URI of the image.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						type: 'string',
						description: "MUST be the IRI 'Image'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: false,
				description:
					'Metadata about images that represent assertions, achieve or profiles. These properties can typically be represented as just the id string of the image, but using a fleshed-out document allows for including captions and other applicable metadata.',
				'x-class-pid': 'org.1edtech.ob.v3p0.image.class'
			},
			Profile: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					image: {
						$ref: '#/components/schemas/Image'
					},
					endorsement: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the individual or organization represented by this profile. These endorsements are signed with a Data Integrity proof format.',
						items: {
							$ref: '#/components/schemas/EndorsementCredential'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.endorsementcredential.class'
					},
					address: {
						$ref: '#/components/schemas/Address'
					},
					givenName: {
						type: 'string',
						description:
							"Given name. In the western world, often referred to as the 'first name' of a person.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					description: {
						type: 'string',
						description: 'A short description of the issuer entity or organization.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					official: {
						type: 'string',
						description:
							'If the entity is an organization, `official` is the name of an authorized official of the organization.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					honorificPrefix: {
						type: 'string',
						description:
							"Honorific prefix(es) preceding a person's name (e.g. 'Dr', 'Mrs' or 'Mr').",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					dateOfBirth: {
						type: 'string',
						description: 'Birthdate of the person.',
						format: 'date',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.date.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Profile'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					url: {
						type: 'string',
						description:
							'The homepage or social media profile of the entity, whether individual or institutional. Should be a URL/URI Accessible via HTTP.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					endorsementJwt: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the individual or organization represented by this profile. These endorsements are signed with the VC-JWT proof format.',
						items: {
							pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
							type: 'string',
							description: 'A `String` in Compact JWS format [[RFC7515]].'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.compactjws.class'
					},
					honorificSuffix: {
						type: 'string',
						description: "Honorific suffix(es) following a person's name (e.g. 'M.D, PhD').",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					phone: {
						type: 'string',
						description: 'A phone number.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.phonenumber.class'
					},
					familyName: {
						type: 'string',
						description:
							"Family name. In the western world, often referred to as the 'last name' of a person.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					familyNamePrefix: {
						type: 'string',
						description:
							"Family name prefix. As used in some locales, this is the leading part of a family name (e.g. 'de' in the name 'de Boer').",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					name: {
						type: 'string',
						description: 'The name of the entity or organization.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					patronymicName: {
						type: 'string',
						description: 'Patronymic name.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description: 'Unique URI for the Issuer/Profile file.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					otherIdentifier: {
						minItems: 0,
						type: 'array',
						description: 'A list of identifiers for the described entity.',
						items: {
							$ref: '#/components/schemas/IdentifierEntry'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.identifierentry.class'
					},
					parentOrg: {
						$ref: '#/components/schemas/Profile'
					},
					additionalName: {
						type: 'string',
						description:
							"Additional name. Includes what is often referred to as 'middle name' in the western world.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					email: {
						type: 'string',
						description: 'An email address.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.emailaddress.class'
					}
				},
				additionalProperties: true,
				description:
					'A Profile is a collection of information that describes the entity or organization using Open Badges. Issuers must be represented as Profiles, and endorsers, or other entities may also be represented using this vocabulary. Each Profile that represents an Issuer may be referenced in many BadgeClasses that it has defined. Anyone can create and host an Issuer file to start issuing Open Badges. Issuers may also serve as recipients of Open Badges, often identified within an Assertion by specific properties, like their url or contact email address.',
				'x-class-pid': 'org.1edtech.ob.v3p0.profile.class'
			},
			Result: {
				required: ['type'],
				type: 'object',
				properties: {
					achievedLevel: {
						type: 'string',
						description:
							'If the result represents an achieved rubric criterion level (e.g. Mastered), the value is the `id` of the RubricCriterionLevel in linked ResultDescription.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					resultDescription: {
						type: 'string',
						description:
							'An achievement can have many result descriptions describing possible results. The value of `resultDescription` is the `id` of the result description linked to this result. The linked result description must be in the achievement that is being asserted.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Result'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					alignment: {
						minItems: 0,
						type: 'array',
						description:
							'The alignments between this result and nodes in external frameworks. This set of alignments are in addition to the set of alignments defined in the corresponding ResultDescription object.',
						items: {
							$ref: '#/components/schemas/Alignment'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.alignment.class'
					},
					value: {
						type: 'string',
						description:
							"A string representing the result of the performance, or demonstration, of the achievement. For example, 'A' if the recipient received an A grade in class.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					status: {
						type: 'string',
						description:
							'The status of the achievement. Required if `resultType` of the linked ResultDescription is Status.',
						enum: [
							'Completed',
							'Enrolled',
							'Failed',
							'InProgress',
							'OnHold',
							'Provisional',
							'Withdrew'
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.resultstatustype.class'
					}
				},
				additionalProperties: true,
				description: 'Describes a result that was achieved.',
				'x-class-pid': 'org.1edtech.ob.v3p0.result.class'
			},
			IdentifierEntry: {
				required: ['type', 'identifier', 'identifierType'],
				type: 'object',
				properties: {
					identifier: {
						type: 'string',
						description: 'An identifier.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.identifier.class'
					},
					identifierType: {
						description: 'The identifier type.',
						anyOf: [
							{
								type: 'string',
								enum: [
									'name',
									'sourcedId',
									'systemId',
									'productId',
									'userName',
									'accountId',
									'emailAddress',
									'nationalIdentityNumber',
									'isbn',
									'issn',
									'lisSourcedId',
									'oneRosterSourcedId',
									'sisSourcedId',
									'ltiContextId',
									'ltiDeploymentId',
									'ltiToolId',
									'ltiPlatformId',
									'ltiUserId',
									'identifier'
								]
							},
							{
								pattern: '(ext:)[a-zA-Z0-9\\.\\-_]+',
								type: 'string'
							}
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.identifiertypeenum.class'
					},
					type: {
						type: 'string',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'IdentifierEntry'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: false,
				description: 'The IdentifierEntry complex type.',
				'x-class-pid': 'org.1edtech.ob.v3p0.identifierentry.class'
			},
			Alignment: {
				required: ['type', 'targetName', 'targetUrl'],
				type: 'object',
				properties: {
					targetName: {
						type: 'string',
						description: 'Name of the alignment.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					targetFramework: {
						type: 'string',
						description: 'Name of the framework the alignment target.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					targetDescription: {
						type: 'string',
						description: 'Short description of the alignment target.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					targetCode: {
						type: 'string',
						description:
							'If applicable, a locally unique string identifier that identifies the alignment target within its framework and/or targetUrl.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					targetType: {
						description: 'The type of the alignment target node.',
						anyOf: [
							{
								type: 'string',
								enum: [
									'ceasn:Competency',
									'ceterms:Credential',
									'CFItem',
									'CFRubric',
									'CFRubricCriterion',
									'CFRubricCriterionLevel',
									'CTDL'
								]
							},
							{
								pattern: '(ext:)[a-zA-Z0-9\\.\\-_]+',
								type: 'string'
							}
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.alignmenttargettype.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Alignment'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					targetUrl: {
						type: 'string',
						description:
							'URL linking to the official description of the alignment target, for example an individual standard within an educational framework.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.url.class'
					}
				},
				additionalProperties: true,
				description:
					'Describes an alignment between an achievement and a node in an educational framework.',
				'x-class-pid': 'org.1edtech.ob.v3p0.alignment.class'
			},
			Imsx_CodeMinorField: {
				required: ['imsx_codeMinorFieldName', 'imsx_codeMinorFieldValue'],
				type: 'object',
				properties: {
					imsx_codeMinorFieldName: {
						type: 'string',
						description:
							'This should contain the identity of the system that has produced the code minor status code report.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.normalizedstring.class'
					},
					imsx_codeMinorFieldValue: {
						type: 'string',
						description:
							'The code minor status code (this is a value from the corresponding enumerated vocabulary).',
						enum: [
							'forbidden',
							'fullsuccess',
							'internal_server_error',
							'invalid_data',
							'invalid_query_parameter',
							'misdirected_request',
							'not_acceptable',
							'not_allowed',
							'not_modified',
							'server_busy',
							'unauthorizedrequest',
							'unknown'
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.imsx_codeminorfieldvalue.class'
					}
				},
				additionalProperties: false,
				description: 'This is the container for a single code minor status code.',
				'x-class-pid': 'org.1edtech.ob.v3p0.imsx_codeminorfield.class'
			},
			ServiceDescriptionDocument: {
				required: ['openapi', 'info', 'components'],
				type: 'object',
				properties: {
					components: {
						$ref: '#/components/schemas/OpenApiComponents'
					},
					openapi: {
						type: 'string',
						description:
							'This string MUST be the semantic version number of the OpenAPI Specification version that the OpenAPI document uses. The openapi field SHOULD be used by tooling specifications and clients to interpret the OpenAPI document. This is not related to the API info.version string.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					info: {
						$ref: '#/components/schemas/OpenApiInfo'
					}
				},
				additionalProperties: true,
				description:
					'The Service Description Document (SDD) is a machine readable document that contains the description of the service features supported by the Provider/Platform. The SDD is an OpenAPI 3.0 (JSON) [[OPENAPIS-3.0]] structured document that MUST be a profiled version of the OpenAPI 3.0 (JSON) file provided provided with this specification. This profiled version contains all of the details about the supported set of service end-points, the supported optional data fields, definitions of the proprietary data fields supplied using the permitted extension mechanisms, definitions of the available proprietary endpoints, and information about the security mechanisms.',
				'x-class-pid': 'org.1edtech.ob.v3p0.servicedescriptiondocument.class'
			},
			Evidence: {
				required: ['type'],
				type: 'object',
				properties: {
					audience: {
						type: 'string',
						description: 'A description of the intended audience for a piece of evidence.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					narrative: {
						type: 'string',
						description:
							'A narrative that describes the evidence and process of achievement that led to an assertion.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.markdown.class'
					},
					name: {
						type: 'string',
						description: 'A descriptive title of the evidence.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					genre: {
						type: 'string',
						description:
							'A string that describes the type of evidence. For example, Poetry, Prose, Film.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					description: {
						type: 'string',
						description: 'A longer description of the evidence.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description:
							'The URL of a webpage presenting evidence of achievement or the evidence encoded as a Data URI. The schema of the webpage is undefined.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Evidence'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description:
					'Descriptive metadata about evidence related to the achievement assertion. Each instance of the evidence class present in an assertion corresponds to one entity, though a single entry can describe a set of items collectively. There may be multiple evidence entries referenced from an assertion. The narrative property is also in scope of the assertion class to provide an overall description of the achievement related to the assertion in rich text. It is used here to provide a narrative of achievement of the specific entity described. If both the description and narrative properties are present, displayers can assume the narrative value goes into more detail and is not simply a recapitulation of description.',
				'x-class-pid': 'org.1edtech.ob.v3p0.evidence.class'
			},
			Achievement: {
				required: ['id', 'type', 'criteria', 'description', 'name'],
				type: 'object',
				properties: {
					achievementType: {
						description: 'The type of achievement. This is an extensible vocabulary.',
						anyOf: [
							{
								type: 'string',
								enum: [
									'Achievement',
									'ApprenticeshipCertificate',
									'Assessment',
									'Assignment',
									'AssociateDegree',
									'Award',
									'Badge',
									'BachelorDegree',
									'Certificate',
									'CertificateOfCompletion',
									'Certification',
									'CommunityService',
									'Competency',
									'Course',
									'CoCurricular',
									'Degree',
									'Diploma',
									'DoctoralDegree',
									'Fieldwork',
									'GeneralEducationDevelopment',
									'JourneymanCertificate',
									'LearningProgram',
									'License',
									'Membership',
									'ProfessionalDoctorate',
									'QualityAssuranceCredential',
									'MasterCertificate',
									'MasterDegree',
									'MicroCredential',
									'ResearchDoctorate',
									'SecondarySchoolDiploma'
								]
							},
							{
								pattern: '(ext:)[a-zA-Z0-9\\.\\-_]+',
								type: 'string'
							}
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.achievementtype.class'
					},
					image: {
						$ref: '#/components/schemas/Image'
					},
					creator: {
						$ref: '#/components/schemas/Profile'
					},
					endorsement: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the Achievement. These endorsements are signed with a Data Integrity proof format.',
						items: {
							$ref: '#/components/schemas/EndorsementCredential'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.endorsementcredential.class'
					},
					criteria: {
						$ref: '#/components/schemas/Criteria'
					},
					humanCode: {
						type: 'string',
						description: 'The code, generally human readable, associated with an achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					description: {
						type: 'string',
						description: 'A short description of the achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					inLanguage: {
						pattern: '^[a-z]{2,4}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$',
						type: 'string',
						description: 'The language of the achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.languagecode.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					version: {
						type: 'string',
						description:
							'The version property allows issuers to set a version string for an Achievement. This is particularly useful when replacing a previous version with an update.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					endorsementJwt: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the Achievement. These endorsements are signed with the VC-JWT proof format.',
						items: {
							pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
							type: 'string',
							description: 'A `String` in Compact JWS format [[RFC7515]].'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.compactjws.class'
					},
					creditsAvailable: {
						type: 'number',
						description:
							'Credit hours associated with this entity, or credit hours possible. For example 3.0.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.float.class'
					},
					related: {
						minItems: 0,
						type: 'array',
						description:
							'The related property identifies another Achievement that should be considered the same for most purposes. It is primarily intended to identify alternate language editions or previous versions of Achievements.',
						items: {
							$ref: '#/components/schemas/Related'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.related.class'
					},
					name: {
						type: 'string',
						description: 'The name of the achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					specialization: {
						type: 'string',
						description:
							"Name given to the focus, concentration, or specific area of study defined in the achievement. Examples include 'Entrepreneurship', 'Technical Communication', and 'Finance'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description: 'Unique URI for the Achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					resultDescription: {
						minItems: 0,
						type: 'array',
						description:
							'The set of result descriptions that may be asserted as results with this achievement.',
						items: {
							$ref: '#/components/schemas/ResultDescription'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.resultdescription.class'
					},
					tag: {
						minItems: 0,
						type: 'array',
						description:
							'One or more short, human-friendly, searchable, keywords that describe the type of achievement.',
						items: {
							type: 'string',
							description: 'Character strings.'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					alignment: {
						minItems: 0,
						type: 'array',
						description:
							'An object describing which objectives or educational standards this achievement aligns to, if any.',
						items: {
							$ref: '#/components/schemas/Alignment'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.alignment.class'
					},
					otherIdentifier: {
						minItems: 0,
						type: 'array',
						description: 'A list of identifiers for the described entity.',
						items: {
							$ref: '#/components/schemas/IdentifierEntry'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.identifierentry.class'
					},
					fieldOfStudy: {
						type: 'string',
						description:
							'Category, subject, area of study, discipline, or general branch of knowledge. Examples include Business, Education, Psychology, and Technology.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description:
					'A collection of information about the accomplishment recognized by the Assertion. Many assertions may be created corresponding to one Achievement.',
				'x-class-pid': 'org.1edtech.ob.v3p0.achievement.class'
			},
			IdentityObject: {
				required: ['type', 'hashed', 'identityHash', 'identityType'],
				type: 'object',
				properties: {
					salt: {
						type: 'string',
						description:
							'If the `identityHash` is hashed, this should contain the string used to salt the hash. If this value is not provided, it should be assumed that the hash was not salted.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					identityHash: {
						type: 'string',
						description:
							"Either the IdentityHash of the identity or the plaintext value. If it's possible that the plaintext transmission and storage of the identity value would leak personally identifiable information where there is an expectation of privacy, it is strongly recommended that an IdentityHash be used.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.identityhash.class'
					},
					identityType: {
						description: 'The identity type.',
						anyOf: [
							{
								type: 'string',
								enum: [
									'name',
									'sourcedId',
									'systemId',
									'productId',
									'userName',
									'accountId',
									'emailAddress',
									'nationalIdentityNumber',
									'isbn',
									'issn',
									'lisSourcedId',
									'oneRosterSourcedId',
									'sisSourcedId',
									'ltiContextId',
									'ltiDeploymentId',
									'ltiToolId',
									'ltiPlatformId',
									'ltiUserId',
									'identifier'
								]
							},
							{
								pattern: '(ext:)[a-zA-Z0-9\\.\\-_]+',
								type: 'string'
							}
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.identifiertypeenum.class'
					},
					hashed: {
						type: 'boolean',
						description: 'Whether or not the `identityHash` value is hashed.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.boolean.class'
					},
					type: {
						type: 'string',
						description: "MUST be the IRI 'IdentityObject'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: false,
				description: 'A collection of information about the recipient of an achievement.',
				'x-class-pid': 'org.1edtech.ob.v3p0.identityobject.class'
			},
			Imsx_CodeMinor: {
				required: ['imsx_codeMinorField'],
				type: 'object',
				properties: {
					imsx_codeMinorField: {
						minItems: 1,
						type: 'array',
						description: 'Each reported code minor status code.',
						items: {
							$ref: '#/components/schemas/Imsx_CodeMinorField'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.imsx_codeminorfield.class'
					}
				},
				additionalProperties: false,
				description:
					'This is the container for the set of code minor status codes reported in the responses from the Service Provider.',
				'x-class-pid': 'org.1edtech.ob.v3p0.imsx_codeminor.class'
			},
			CredentialStatus: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description: "The value MUST be the URL of the issuer's credential status method.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						type: 'string',
						description: 'The name of the credential status method.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description:
					'The information in CredentialStatus is used to discover information about the current status of a verifiable credential, such as whether it is suspended or revoked.',
				'x-class-pid': 'org.1edtech.ob.v3p0.credentialstatus.class'
			},
			Imsx_StatusInfo: {
				required: ['imsx_codeMajor', 'imsx_severity'],
				type: 'object',
				properties: {
					imsx_codeMinor: {
						$ref: '#/components/schemas/Imsx_CodeMinor'
					},
					imsx_codeMajor: {
						type: 'string',
						description: 'The code major value (from the corresponding enumerated vocabulary).',
						enum: ['failure', 'processing', 'success', 'unsupported'],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.imsx_codemajor.class'
					},
					imsx_description: {
						type: 'string',
						description:
							'A human readable description supplied by the entity creating the status code information.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					imsx_severity: {
						type: 'string',
						description: 'The severity value (from the corresponding enumerated vocabulary).',
						enum: ['error', 'status', 'warning'],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.imsx_severity.class'
					}
				},
				additionalProperties: false,
				description:
					'This is the container for the status code and associated information returned within the HTTP messages received from the Service Provider.',
				'x-class-pid': 'org.1edtech.ob.v3p0.imsx_statusinfo.class'
			},
			TermsOfUse: {
				required: ['type'],
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description: 'The value MUST be a URI identifying the term of use.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						type: 'string',
						description: 'The value MUST identify the type of the terms of use.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description:
					'Terms of use can be utilized by an issuer or a holder to communicate the terms under which a verifiable credential or verifiable presentation was issued',
				'x-class-pid': 'org.1edtech.ob.v3p0.termsofuse.class'
			},
			OpenApiOAuth2SecurityScheme: {
				required: ['type', 'x-imssf-registrationUrl'],
				type: 'object',
				properties: {
					'x-imssf-registrationUrl': {
						type: 'string',
						description: 'A fully qualified URL to the Client Registration endpoint.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.url.class'
					},
					description: {
						type: 'string',
						description: 'A short description for the security scheme.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					type: {
						type: 'string',
						description: 'MUST be the string `oauth2`.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'Defines an OAuth2 security scheme that can be used by the operations.',
				'x-class-pid': 'org.1edtech.ob.v3p0.openapioauth2securityscheme.class'
			},
			RubricCriterionLevel: {
				required: ['id', 'type', 'name'],
				type: 'object',
				properties: {
					level: {
						type: 'string',
						description: 'The rubric performance level in terms of success.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					name: {
						type: 'string',
						description: 'The name of the rubric criterion level.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					description: {
						type: 'string',
						description: 'Description of the rubric criterion level.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description:
							'The unique URI for this rubric criterion level. Required so a result can link to this rubric criterion level.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'RubricCriterionLevel'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					alignment: {
						minItems: 0,
						type: 'array',
						description:
							'Alignments between this rubric criterion level and a rubric criterion levels defined in external frameworks.',
						items: {
							$ref: '#/components/schemas/Alignment'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.alignment.class'
					},
					points: {
						type: 'string',
						description: 'The points associated with this rubric criterion level.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'Describes a rubric criterion level.',
				'x-class-pid': 'org.1edtech.ob.v3p0.rubriccriterionlevel.class'
			},
			OpenApiInfo: {
				required: ['termsOfService', 'title', 'version', 'x-imssf-privacyPolicyUrl'],
				type: 'object',
				properties: {
					'x-imssf-image': {
						type: 'string',
						description:
							'An image representing the [=resource server=]. MAY be a Data URI or the URL where the image may be found.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					'x-imssf-privacyPolicyUrl': {
						type: 'string',
						description: "A fully qualified URL to the [=resource server=]'s privacy policy.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.url.class'
					},
					termsOfService: {
						type: 'string',
						description: "A fully qualified URL to the [=resource server=]'s terms of service.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.url.class'
					},
					title: {
						type: 'string',
						description: 'The name of the [=resource server=].',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					version: {
						type: 'string',
						description: 'The version of the API.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description:
					'The object provides metadata about the API. The metadata MAY be used by the clients if needed, and MAY be presented in editing or documentation generation tools for convenience.',
				'x-class-pid': 'org.1edtech.ob.v3p0.openapiinfo.class'
			},
			EndorsementSubject: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					endorsementComment: {
						type: 'string',
						description: 'Allows endorsers to make a simple claim in writing about the entity.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.markdown.class'
					},
					id: {
						type: 'string',
						description:
							'The identifier of the individual, entity, organization, assertion, or achievement that is endorsed.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the URI 'EndorsementSubject'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description: 'A collection of information about the subject of the endorsement.',
				'x-class-pid': 'org.1edtech.ob.v3p0.endorsementsubject.class'
			},
			AchievementCredential: {
				required: ['@context', 'id', 'type', 'name', 'credentialSubject', 'issuer', 'validFrom'],
				type: 'object',
				properties: {
					image: {
						$ref: '#/components/schemas/Image'
					},
					credentialSchema: {
						minItems: 0,
						type: 'array',
						description:
							'The value of the `credentialSchema` property MUST be one or more data schemas that provide verifiers with enough information to determine if the provided data conforms to the provided schema.',
						items: {
							$ref: '#/components/schemas/CredentialSchema'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.credentialschema.class'
					},
					awardedDate: {
						type: 'string',
						description:
							'Timestamp of when the credential was awarded. `validFrom` is used to determine the most recent version of a Credential in conjunction with `issuer` and `id`. Consequently, the only way to update a Credental is to update the `validFrom`, losing the date when the Credential was originally awarded. `awardedDate` is meant to keep this original date.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					endorsement: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the credential, and the achievement and profiles in the credential. These endorsements are signed with a Data Integrity proof format.',
						items: {
							$ref: '#/components/schemas/EndorsementCredential'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.endorsementcredential.class'
					},
					evidence: {
						minItems: 0,
						type: 'array',
						description:
							'A description of the work that the recipient did to earn the achievement. This can be a page that links out to other pages if linking directly to the work is infeasible.',
						items: {
							$ref: '#/components/schemas/Evidence'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.evidence.class'
					},
					credentialSubject: {
						$ref: '#/components/schemas/AchievementSubject'
					},
					description: {
						type: 'string',
						description: 'The short description of the credential for display purposes in wallets.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					validFrom: {
						type: 'string',
						description: 'Timestamp of when the credential becomes valid.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the URI 'VerifiableCredential', and one of the items MUST be the URI 'AchievementCredential' or the URI 'OpenBadgeCredential'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					'@context': {
						minItems: 1,
						type: 'array',
						description:
							"The value of the `@context` property MUST be an ordered set where the first item is a URI with the value 'https://www.w3.org/ns/credentials/v2', and the second item is a URI with the value 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'.",
						items: {
							description:
								'JSON-LD Context. Either a URI with the context definition or a Map with a local context definition MUST be supplied.',
							oneOf: [
								{
									$ref: '#/components/schemas/Map'
								},
								{
									type: 'string',
									description:
										'A `NormalizedString` that respresents a Uniform Resource Identifier (URI).'
								}
							]
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.context.class'
					},
					issuer: {
						$ref: '#/components/schemas/Profile'
					},
					credentialStatus: {
						$ref: '#/components/schemas/CredentialStatus'
					},
					endorsementJwt: {
						minItems: 0,
						type: 'array',
						description:
							'Allows endorsers to make specific claims about the credential, and the achievement and profiles in the credential. These endorsements are signed with the VC-JWT proof format.',
						items: {
							pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
							type: 'string',
							description: 'A `String` in Compact JWS format [[RFC7515]].'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.compactjws.class'
					},
					termsOfUse: {
						minItems: 0,
						type: 'array',
						description:
							'The value of the `termsOfUse` property tells the verifier what actions it is required to perform (an obligation), not allowed to perform (a prohibition), or allowed to perform (a permission) if it is to accept the verifiable credentia',
						items: {
							$ref: '#/components/schemas/TermsOfUse'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.termsofuse.class'
					},
					name: {
						type: 'string',
						description:
							'The name of the credential for display purposes in wallets. For example, in a list of credentials and in detail views.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					refreshService: {
						$ref: '#/components/schemas/RefreshService'
					},
					validUntil: {
						type: 'string',
						description:
							'If the credential has some notion of validity period, this indicates a timestamp when a credential should no longer be considered valid. After this time, the credential should be considered invalid.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					id: {
						type: 'string',
						description: 'Unambiguous reference to the credential.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					proof: {
						minItems: 0,
						type: 'array',
						description:
							'If present, one or more embedded cryptographic proofs that can be used to detect tampering and verify the authorship of the credential.',
						items: {
							$ref: '#/components/schemas/Proof'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.proof.class'
					}
				},
				additionalProperties: true,
				description:
					'AchievementCredentials are representations of an awarded achievement, used to share information about a achievement belonging to one earner. Maps to a Verifiable Credential as defined in the [[VC-DATA-MODEL-2.0]]. As described in [[[#data-integrity]]], at least one proof mechanism, and the details necessary to evaluate that proof, MUST be expressed for a credential to be a verifiable credential. In the case of an embedded proof, the credential MUST append the proof in the `proof` property.',
				'x-class-pid': 'org.1edtech.ob.v3p0.achievementcredential.class'
			},
			GeoCoordinates: {
				required: ['type', 'latitude', 'longitude'],
				type: 'object',
				properties: {
					latitude: {
						type: 'number',
						description: 'The latitude of the location [[WGS84]].',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.float.class'
					},
					type: {
						type: 'string',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'GeoCoordinates'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					longitude: {
						type: 'number',
						description: 'The longitude of the location [[WGS84]].',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.float.class'
					}
				},
				additionalProperties: true,
				description: 'The geographic coordinates of a location.',
				'x-class-pid': 'org.1edtech.ob.v3p0.geocoordinates.class'
			},
			RefreshService: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					id: {
						type: 'string',
						description: "The value MUST be the URL of the issuer's refresh service.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						type: 'string',
						description: 'The name of the refresh service method.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					}
				},
				additionalProperties: true,
				description:
					'The information in RefreshService is used to refresh the verifiable credential.',
				'x-class-pid': 'org.1edtech.ob.v3p0.refreshservice.class'
			},
			Related: {
				required: ['id', 'type'],
				type: 'object',
				properties: {
					inLanguage: {
						pattern: '^[a-z]{2,4}(-[A-Z][a-z]{3})?(-([A-Z]{2}|[0-9]{3}))?$',
						type: 'string',
						description: 'The language of the related achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.languagecode.class'
					},
					id: {
						type: 'string',
						description: 'The related achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'Related'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					version: {
						type: 'string',
						description: 'The version of the related achievement.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'Identifies a related achievement.',
				'x-class-pid': 'org.1edtech.ob.v3p0.related.class'
			},
			ResultDescription: {
				required: ['id', 'type', 'name', 'resultType'],
				type: 'object',
				properties: {
					valueMax: {
						type: 'string',
						description: 'The maximum possible `value` that may be asserted in a linked result.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					valueMin: {
						type: 'string',
						description: 'The minimum possible `value` that may be asserted in a linked result.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					rubricCriterionLevel: {
						minItems: 0,
						type: 'array',
						description:
							'An ordered array of rubric criterion levels that may be asserted in the linked result. The levels should be ordered from low to high as determined by the achievement creator.',
						items: {
							$ref: '#/components/schemas/RubricCriterionLevel'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.rubriccriterionlevel.class'
					},
					requiredLevel: {
						type: 'string',
						description:
							'The `id` of the rubric criterion level required to pass as determined by the achievement creator.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					name: {
						type: 'string',
						description: 'The name of the result.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description:
							'The unique URI for this result description. Required so a result can link to this result description.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					allowedValue: {
						minItems: 0,
						type: 'array',
						description:
							'An ordered list of allowed values. The values should be ordered from low to high as determined by the achievement creator.',
						items: {
							type: 'string',
							description: 'Character strings.'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'ResultDescription'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					alignment: {
						minItems: 0,
						type: 'array',
						description:
							'Alignments between this result description and nodes in external frameworks.',
						items: {
							$ref: '#/components/schemas/Alignment'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.alignment.class'
					},
					resultType: {
						description:
							'The type of result this description represents. This is an extensible enumerated vocabulary.',
						anyOf: [
							{
								type: 'string',
								enum: [
									'GradePointAverage',
									'LetterGrade',
									'Percent',
									'PerformanceLevel',
									'PredictedScore',
									'RawScore',
									'Result',
									'RubricCriterion',
									'RubricCriterionLevel',
									'RubricScore',
									'ScaledScore',
									'Status'
								]
							},
							{
								pattern: '(ext:)[a-zA-Z0-9\\.\\-_]+',
								type: 'string'
							}
						],
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.resulttype.class'
					},
					requiredValue: {
						type: 'string',
						description:
							'A value from `allowedValue` or within the range of `valueMin` to `valueMax` required to pass as determined by the achievement creator.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'Describes a possible achievement result.',
				'x-class-pid': 'org.1edtech.ob.v3p0.resultdescription.class'
			},
			Proof: {
				required: ['type'],
				type: 'object',
				properties: {
					proofValue: {
						type: 'string',
						description: 'Value of the proof.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					created: {
						type: 'string',
						description: 'Date the proof was created.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.datetime.class'
					},
					domain: {
						type: 'string',
						description: 'The domain of the proof to restrict its use to a particular target.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					challenge: {
						type: 'string',
						description:
							'A value chosen by the verifier to mitigate authentication proof replay attacks.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					proofPurpose: {
						type: 'string',
						description:
							"The purpose of the proof to be used with `verificationMethod`. MUST be 'assertionMethod'.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					type: {
						type: 'string',
						description: 'Signature suite used to produce proof.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					verificationMethod: {
						type: 'string',
						description: 'The URL of the public key that can verify the signature.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					nonce: {
						type: 'string',
						description:
							'A value chosen by the creator of proof to randomize proof values for privacy purposes.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					cryptosuite: {
						type: 'string',
						description: 'The suite used to create the proof.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					}
				},
				additionalProperties: true,
				description: 'A JSON-LD Linked Data proof.',
				'x-class-pid': 'org.1edtech.ob.v3p0.proof.class'
			},
			EndorsementCredential: {
				required: ['@context', 'type', 'id', 'name', 'credentialSubject', 'issuer', 'validFrom'],
				type: 'object',
				properties: {
					credentialSchema: {
						minItems: 0,
						type: 'array',
						description:
							'The value of the `credentialSchema` property MUST be one or more data schemas that provide verifiers with enough information to determine if the provided data conforms to the provided schema.',
						items: {
							$ref: '#/components/schemas/CredentialSchema'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.credentialschema.class'
					},
					awardedDate: {
						type: 'string',
						description:
							'Timestamp of when the credential was awarded. `validFrom` is used to determine the most recent version of a Credential in conjunction with `issuer` and `id`. Consequently, the only way to update a Credental is to update the `validFrom`, losing the date when the Credential was originally awarded. `awardedDate` is meant to keep this original date.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					credentialSubject: {
						$ref: '#/components/schemas/EndorsementSubject'
					},
					description: {
						type: 'string',
						description: 'The short description of the credential for display purposes in wallets.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					validFrom: {
						type: 'string',
						description: 'Timestamp of when the credential becomes valid.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the URI 'VerifiableCredential', and one of the items MUST be the URI 'EndorsementCredential'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					'@context': {
						minItems: 1,
						type: 'array',
						description:
							"The value of the `@context` property MUST be an ordered set where the first item is a URI with the value 'https://www.w3.org/ns/credentials/v2', and the second item is a URI with the value 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'.",
						items: {
							description:
								'JSON-LD Context. Either a URI with the context definition or a Map with a local context definition MUST be supplied.',
							oneOf: [
								{
									$ref: '#/components/schemas/Map'
								},
								{
									type: 'string',
									description:
										'A `NormalizedString` that respresents a Uniform Resource Identifier (URI).'
								}
							]
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.context.class'
					},
					issuer: {
						$ref: '#/components/schemas/Profile'
					},
					credentialStatus: {
						$ref: '#/components/schemas/CredentialStatus'
					},
					termsOfUse: {
						minItems: 0,
						type: 'array',
						description:
							'The value of the `termsOfUse` property tells the verifier what actions it is required to perform (an obligation), not allowed to perform (a prohibition), or allowed to perform (a permission) if it is to accept the verifiable credentia',
						items: {
							$ref: '#/components/schemas/TermsOfUse'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.termsofuse.class'
					},
					name: {
						type: 'string',
						description:
							'The name of the credential for display purposes in wallets. For example, in a list of credentials and in detail views.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					refreshService: {
						$ref: '#/components/schemas/RefreshService'
					},
					validUntil: {
						type: 'string',
						description:
							'If the credential has some notion of validity period, this indicates a timestamp when a credential should no longer be considered valid. After this time, the credential should be considered invalid.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.datetimez.class'
					},
					id: {
						type: 'string',
						description: 'Unambiguous reference to the credential.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					},
					proof: {
						minItems: 0,
						type: 'array',
						description:
							'If present, one or more embedded cryptographic proofs that can be used to detect tampering and verify the authorship of the credential.',
						items: {
							$ref: '#/components/schemas/Proof'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.proof.class'
					}
				},
				additionalProperties: true,
				description:
					'A verifiable credential that asserts a claim about an entity. As described in [[[#data-integrity]]], at least one proof mechanism, and the details necessary to evaluate that proof, MUST be expressed for a credential to be a verifiable credential. In the case of an embedded proof, the credential MUST append the proof in the `proof` property.',
				'x-class-pid': 'org.1edtech.ob.v3p0.endorsementcredential.class'
			},
			AchievementSubject: {
				required: ['type', 'achievement'],
				type: 'object',
				properties: {
					identifier: {
						minItems: 0,
						type: 'array',
						description:
							'Other identifiers for the recipient of the achievement. Either `id` or at least one `identifier` MUST be supplied.',
						items: {
							$ref: '#/components/schemas/IdentityObject'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.identityobject.class'
					},
					image: {
						$ref: '#/components/schemas/Image'
					},
					activityStartDate: {
						type: 'string',
						description: 'The datetime the activity started.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.datetime.class'
					},
					role: {
						type: 'string',
						description:
							"Role, position, or title of the learner when demonstrating or performing the achievement or evidence of learning being asserted. Examples include 'Student President', 'Intern', 'Captain', etc.",
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					achievement: {
						$ref: '#/components/schemas/Achievement'
					},
					narrative: {
						type: 'string',
						description:
							'A narrative that connects multiple pieces of evidence. Likely only present at this location if evidence is a multi-value array.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.markdown.class'
					},
					source: {
						$ref: '#/components/schemas/Profile'
					},
					type: {
						minItems: 1,
						type: 'array',
						description:
							"The value of the type property MUST be an unordered set. One of the items MUST be the IRI 'AchievementSubject'.",
						items: {
							type: 'string',
							description:
								'A `NormalizedString` that represents an Internationalized Resource Identifier (IRI), which extends the ASCII characters subset of the Uniform Resource Identifier (URI).'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.iri.class'
					},
					result: {
						minItems: 0,
						type: 'array',
						description: 'The set of results being asserted.',
						items: {
							$ref: '#/components/schemas/Result'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.result.class'
					},
					creditsEarned: {
						type: 'number',
						description:
							'The number of credits earned, generally in semester or quarter credit hours. This field correlates with the Achievement `creditsAvailable` field.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.float.class'
					},
					activityEndDate: {
						type: 'string',
						description: 'The datetime the activity ended.',
						format: 'date-time',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.datetime.class'
					},
					licenseNumber: {
						type: 'string',
						description: 'The license number that was issued with this credential.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					term: {
						type: 'string',
						description: 'The academic term in which this assertion was achieved.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.primitive.string.class'
					},
					id: {
						type: 'string',
						description:
							'An identifier for the Credential Subject. Either `id` or at least one `identifier` MUST be supplied.',
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.uri.class'
					}
				},
				additionalProperties: true,
				description:
					'A collection of information about the recipient of an achievement. Maps to Credential Subject in [[VC-DATA-MODEL-2.0]].',
				'x-class-pid': 'org.1edtech.ob.v3p0.achievementsubject.class'
			},
			Map: {
				type: 'object',
				properties: {},
				additionalProperties: true,
				description: 'A map representing an object with unknown, arbitrary properties',
				'x-class-pid': 'org.1edtech.ob.v3p0.map.class'
			},
			GetOpenBadgeCredentialsResponse: {
				type: 'object',
				properties: {
					credential: {
						minItems: 0,
						type: 'array',
						description:
							'OpenBadgeCredentials that have not been signed with the VC-JWT Proof Format MUST be in the `credential` array.',
						items: {
							$ref: '#/components/schemas/AchievementCredential'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.achievementcredential.class'
					},
					compactJwsString: {
						minItems: 0,
						type: 'array',
						description:
							'OpenBadgeCredentials that have been signed with the VC-JWT Proof Format MUST be in the `compactJwsString` array.',
						items: {
							pattern: '^[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]*\\.[a-zA-Z0-9_-]+$',
							type: 'string',
							description: 'A `String` in Compact JWS format [[RFC7515]].'
						},
						'x-srcprop-pid': 'org.1edtech.ob.v3p0.derived.compactjws.class'
					}
				},
				additionalProperties: false,
				description: 'The GetOpenBadgeCredentialsResponse complex type.',
				'x-class-pid': 'org.1edtech.ob.v3p0.getopenbadgecredentialsresponse.class'
			}
		},
		headers: {
			'X-Total-Count': {
				description: 'The total number of resources that are available to be returned',
				schema: {
					type: 'integer',
					format: 'int32'
				}
			}
		},
		securitySchemes: {
			OAuth2ACG: {
				type: 'oauth2',
				flows: {
					authorizationCode: {
						authorizationUrl: 'provider.example.com/auth',
						tokenUrl: 'provider.example.com/token',
						refreshUrl: 'provider.example.com/refresh',
						scopes: DEFAULT_SCOPES
					}
				}
			}
		},
		links: {
			next: {
				operationId: 'getCredentials',
				parameters: {
					limit: '$request.path.limit',
					offset: '$request.path.offset'
				},
				description: 'Get the next set of resources i.e. from offset to offset+limit'
			},
			last: {
				operationId: 'getCredentials',
				parameters: {
					limit: '$request.path.limit',
					offset: '$request.path.offset'
				},
				description: 'Get the last set of resources i.e. from offset to end'
			},
			prev: {
				operationId: 'getCredentials',
				parameters: {
					limit: '$request.path.limit',
					offset: '$request.path.offset'
				},
				description: 'Get the previous set of resources i.e. from last_offset to last_offset+limit'
			},
			first: {
				operationId: 'getCredentials',
				parameters: {
					limit: '$request.path.limit',
					offset: '$request.path.offset'
				},
				description: 'Get the first set of resources i.e. from first to limit'
			}
		}
	}
};

export const serviceDiscoveryDocumentForOrg = (org: Organization) => {
	return {
		...SERVICE_DISCOVERY_DOCUMENT,
		openapi: '3.0.1',
		info: {
			...(org.logo ? { 'x-imssf-image': org.logo } : {}),
			title: org.name + ' Open Badges API',
			termsOfService: 'https://www.example.com/terms', // TODO real url
			'x-imssf-privacyPolicyUrl': 'https://www.example.com/privacy', // TODO real url
			contact: {
				name: org.name,
				email: org.email,
				url: org.url
			}
		},
		components: {
			...SERVICE_DISCOVERY_DOCUMENT.components,
			securitySchemes: {
				OAuth2ACG: {
					type: 'oauth2',
					description: 'OAuth 2.0 Authorization Code Grant authorization',
					'x-imssf-registrationUrl': `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0/registration`,
					flows: {
						authorizationCode: {
							tokenUrl: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0/token`,
							authorizationUrl: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0/auth`,
							refreshUrl: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0/token`,
							scopes:
								SERVICE_DISCOVERY_DOCUMENT.components.securitySchemes.OAuth2ACG.flows
									.authorizationCode.scopes
						}
					}
				}
			}
		},
		servers: [
			{
				url: `${PUBLIC_HTTP_PROTOCOL}://${org.domain}/ims/ob/v3p0`,
				description: 'Open Badges 3.0 API powered by ORCA'
			}
		]
	};
};
