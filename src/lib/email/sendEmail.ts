import * as nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import {
	MAILGUN_API_KEY,
	MAILGUN_DOMAIN,
	MAILGUN_HOST,
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASSWORD,
	SMTP_SECURE
} from '$env/static/private';

const mailgunAuth = {
	auth: {
		api_key: MAILGUN_API_KEY || '',
		domain: MAILGUN_DOMAIN
	},
	host: MAILGUN_HOST || 'api.eu.mailgun.net'
};

function createOrcaTransport(): nodemailer.Transporter {
	if (MAILGUN_API_KEY && MAILGUN_API_KEY !== 'none') {
		return nodemailer.createTransport(mailgunTransport(mailgunAuth));
	}

	if (SMTP_HOST) {
		const port = SMTP_PORT ? Number(SMTP_PORT) : 587;
		const secure = SMTP_SECURE === 'true';
		const auth = SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD || '' } : undefined;
		return nodemailer.createTransport({
			host: SMTP_HOST,
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
			if (MAILGUN_API_KEY == 'none') {
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
