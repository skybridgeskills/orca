import { imageUrl } from '$lib/utils/imageUrl';
import { prisma } from '$lib/../prisma/client';
import { redirect } from '@sveltejs/kit';
import type { RequestEvent } from './$types';

export const GET = async ({ params }: RequestEvent) => {
	const achievementId = params.id;

	const achievement = await prisma.achievement.findFirstOrThrow({
		where: {
			id: achievementId
		}
	});

	const imageLocation = achievement.image
		? imageUrl(achievement.image)
		: imageUrl('/default-ach-image.png');

	throw redirect(307, imageLocation);
};
