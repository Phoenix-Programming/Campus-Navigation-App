import aiosmtplib
from email.message import EmailMessage
from fastapi.templating import Jinja2Templates
from backend.settings import settings

templates: Jinja2Templates = Jinja2Templates(directory="templates")

async def send_email(
	to_email: str,
	subject: str,
	plain_text: str,
	html_content: str | None = None
) -> None:
	msg: EmailMessage = EmailMessage()
	msg["From"] = settings.mail_from
	msg["To"] = to_email
	msg["Subject"] = subject

	msg.set_content(plain_text)

	if html_content:
		msg.add_alternative(html_content, subject="html")

	await aiosmtplib.send(
		msg,
		hostname=settings.mail_server,
		port=settings.mail_port,
		username=settings.mail_username if settings.mail_username else None,
		password=settings.mail_password.get_secret_value() or None,
		start_tls=settings.mail_use_tls
	)

async def send_password_reset_email(to_email: str, username: str, token: str) -> None:
	reset_url = f"{settings.frontend_url}/reset-password?token={token}"

	template = templates.env.get_template("email/password_reset.html")
	html_content = template.render(
		reset_url=reset_url,
		username=username,
		reset_token_expire_minutes=settings.reset_token_expire_minutes
	)

	plain_text = f"""Hi {username},

You requested to reset your password. Click the link below to set a new password:

{reset_url}

This link will expire in {settings.reset_token_expire_minutes} minutes.

If you didn't request a password reset, you can safely ignore this email.

Best regards,
Florida Poly Campus Map Team


The Florida Poly Campus Map and its developers are not affliated with Florida Polytechnic University.
"""

	await send_email(
		to_email=to_email,
		subject="Reset Your Password - Florida Poly Campus Map",
		plain_text=plain_text,
		html_content=html_content
	)
