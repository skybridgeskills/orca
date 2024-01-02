import dotenv from 'dotenv';
import fs from 'fs';
import {
	BucketCannedACL,
	CreateBucketCommand,
	PutBucketCorsCommand,
	PutObjectCommand,
	S3Client,
	type CORSRule
} from '@aws-sdk/client-s3';

const main = async () => {
	dotenv.config();
	if (process.env.S3_USE_LOCALSTACK !== 'true') {
		console.log(
			'Can only create S3 buckets for localstack using this method. Use AWS CDK in infra direcotry for creating buckets in AWS.'
		);
		return 1;
	}

	const s3Client = new S3Client({
		region: process.env.S3_REGION,
		endpoint: process.env.S3_URL, // This is the localstack EDGE_PORT
		forcePathStyle: true
	});

	try {
		console.log(`Trying to create bucket: ${process.env.S3_BUCKET_NAME}`);
		const command = new CreateBucketCommand({
			ACL: BucketCannedACL.public_read_write,
			Bucket: process.env.S3_BUCKET_NAME
		});
		const data = await s3Client.send(command);
		console.log(data);
		console.log('Successfully created a bucket called ', data.Location);
	} catch (err) {
		console.log('Error', err);
	}

	try {
		const filePath = './infra/dist/index.html';

		console.log(`Trying to upload index file from: ${filePath}`);
		const fileContent = fs.readFileSync(filePath);

		// Setting up S3 upload parameters
		const params = {
			Bucket: process.env.S3_BUCKET_NAME,
			Key: 'index.html',
			Body: fileContent
		};

		// Uploading files to the bucket
		const command = new PutObjectCommand(params);
		const results = await s3Client.send(command);
		console.log(
			'Successfully created ' +
				params.Key +
				' and uploaded it to ' +
				params.Bucket +
				'/' +
				params.Key
		);
	} catch (err) {
		console.log('Error', err);
	}

	try {
		console.log(`Trying to add CORS config for bucket: ${process.env.S3_BUCKET_NAME}`);
		const corsRule: CORSRule = {
			// Allow all headers to be sent to this bucket.
			AllowedHeaders: ['*'],
			// Allow only PUT methods to be sent to this bucket.
			AllowedMethods: ['PUT'],
			// Allow only requests from the specified origin.
			AllowedOrigins: ['*'],
			// Allow the entity tag (ETag) header to be returned in the response. The ETag header
			// The entity tag represents a specific version of the object. The ETag reflects
			// changes only to the contents of an object, not its metadata.
			ExposeHeaders: ['ETag'],
			// How long the requesting browser should cache the preflight response. After
			// this time, the preflight request will have to be made again.
			MaxAgeSeconds: 3600
		};
		const command = new PutBucketCorsCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			CORSConfiguration: {
				CORSRules: [corsRule]
			}
		});
		const results = await s3Client.send(command);
		console.log('Successfully added CORS config.');
	} catch (err) {
		console.log('Error', err);
	}
};

main();
