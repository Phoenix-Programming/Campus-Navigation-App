from __future__ import annotations
from datetime import UTC, datetime
from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

class PasswordResetToken(IdMixin, Base):
	__tablename__ = "password_reset_tokens"

	user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
	token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
	expires_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		nullable=False
	)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		default=lambda: datetime.now(UTC)
	)
