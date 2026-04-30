import * as nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import { env } from '$env/dynamic/private';

const mailgunAuth = {
	auth: {
		api_key: env.MAILGUN_API_KEY || '',
		domain: env.MAILGUN_DOMAIN
	},
	host: env.MAILGUN_HOST || 'api.eu.mailgun.net'
};

function createOrcaTransport(): nodemailer.Transporter {
	if (env.MAILGUN_API_KEY && env.MAILGUN_API_KEY !== 'none') {
		return nodemailer.createTransport(mailgunTransport(mailgunAuth));
	}

	if (env.SMTP_HOST) {
		const port = env.SMTP_PORT ? Number(env.SMTP_PORT) : 587;
		const secure = env.SMTP_SECURE === 'true';
		const auth = env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD || '' } : undefined;
		return nodemailer.createTransport({
			host: env.SMTP_HOST,
			port,
			secure,
			auth
		});
	}

	return nodemailer.createTransport({ jsonTransport: true });
}

export const transporter: nodemailer.Transporter = createOrcaTransport();

interface EmailResult {
	success: boolean;
	error?: {
		code?: number;
		message: string | undefined;
	};
}

export const sendOrcaMail = (mailOptions: nodemailer.SendMailOptions) => {
	return new Promise<EmailResult>((resolve, reject) => {
		transporter.sendMail(mailOptions, (err: Error | null, info: any) => {
			if (env.MAILGUN_API_KEY == 'none') {
				console.log(info?.message);
			}
			if (err) {
				resolve({ success: false, error: { code: 500, message: err.message } });
			} else {
				resolve({ success: true });
			}
		});
	});
};
