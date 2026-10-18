import aiosmtplib
from email.message import EmailMessage
from backend.models.email import EmailPriority
from backend.services.interfaces.email_service_interface import EmailServiceInterface
from backend.settings import settings


class EmailService(EmailServiceInterface):
	async def send_email(
		self,
		*,
		to: str | list[str],
		cc: str | list[str] | None = None,
		bcc: str | list[str] | None = None,
		reply_to: str | None = None,
		subject: str,
		plain_text: str,
		html_content: str | None = None,
		priority: EmailPriority = EmailPriority.Normal
	) -> bool:
		msg: EmailMessage = EmailMessage()

		msg["From"] = settings.mail_system_email
		msg["To"] = ", ".join(to) if isinstance(to, list) else to

		if cc: msg["Cc"] = ", ".join(cc) if isinstance(cc, list) else cc
		if bcc: msg["Bcc"] = ", ".join(bcc) if isinstance(bcc, list) else bcc
		if reply_to: msg["Reply-To"] = reply_to

		msg["Subject"] = subject

		# Priority/importance with compatibility for different email clients
		msg["X-Priority"] = priority.value
		msg["Importance"] = priority.name
		msg["X-MSMail-Priority"] = priority.name

		msg.set_content(plain_text)

		if html_content:
			msg.add_alternative(html_content, subtype="html")

		try:
			await aiosmtplib.send(
				msg,
				hostname=settings.mail_server,
				port=settings.mail_port,
				username=settings.mail_system_username,
				password=settings.mail_system_password.get_secret_value(),
				start_tls=True
			)
		except aiosmtplib.SMTPException as e:
			print(f"Failed to send email: {e}")
			return False

		return True
