from __future__ import annotations
from datetime import UTC, datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


class ActiveRefreshToken(IdMixin, Base):
	__tablename__ = "active_refresh_tokens"

	user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
	token_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	is_long_lived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
	last_used_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.now(UTC), nullable=False)
	expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
	is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
