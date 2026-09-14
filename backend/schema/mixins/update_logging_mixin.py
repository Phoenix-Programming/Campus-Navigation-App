from __future__ import annotations
from datetime import datetime, UTC
from sqlalchemy import DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column


class UpdateLoggingMixin():
	last_updated_by: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
	last_updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True),
		default=datetime.now(UTC),
		onupdate=datetime.now(UTC),
		nullable=False
	)
