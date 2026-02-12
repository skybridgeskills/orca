import * as nodemailer from 'nodemailer';
import mailgunTransport from 'nodemailer-mailgun-transport';
import { MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_HOST } from '$env/static/private';

const mailgunAuth = {
	auth: {
		api_key: MAILGUN_API_KEY || '',
		domain: MAILGUN_DOMAIN
	},
	host: MAILGUN_HOST || 'api.eu.mailgun.net'
};

export const transporter: nodemailer.Transporter =
	MAILGUN_API_KEY && MAILGUN_API_KEY != 'none'
		? nodemailer.createTransport(mailgunTransport(mailgunAuth))
		: nodemailer.createTransport({
				jsonTransport: true
			});

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
