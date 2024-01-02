import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3_BUCKET_NAME, S3_REGION, S3_URL, S3_USE_LOCALSTACK } from '$env/static/private';
import { PUBLIC_MEDIA_DOMAIN } from '$env/static/public';
import { imageUrl } from '$lib/utils/imageUrl';

export const isLocalDevFileMedia = (): boolean => {
	return '/media' === PUBLIC_MEDIA_DOMAIN;
};

export const getUploadUrl = async (key: string): Promise<string> => {
	if (isLocalDevFileMedia()) {
		//for local dev media the upload url ends up being the same as the get url
		return imageUrl(key);
	}

	//do the S3 stuff
	const aws_client_params: any = {
		region: S3_REGION
	};

	if ('true' === S3_USE_LOCALSTACK) {
		// override some stuff we need for localstack to work
		aws_client_params['endpoint'] = S3_URL;
		aws_client_params['forcePathStyle'] = true;
	}

	const s3Client = new S3Client(aws_client_params);
	const getSignedUploadUrlCommand = new PutObjectCommand({
		Bucket: S3_BUCKET_NAME,
		Key: key
	});
	return await getSignedUrl(s3Client, getSignedUploadUrlCommand, { expiresIn: 5 });
};
