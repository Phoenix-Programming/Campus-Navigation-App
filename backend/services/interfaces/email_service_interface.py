from abc import ABC, abstractmethod
from backend.models.email import EmailPriority


class EmailServiceInterface(ABC):
    @abstractmethod
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
    ) -> bool: pass
