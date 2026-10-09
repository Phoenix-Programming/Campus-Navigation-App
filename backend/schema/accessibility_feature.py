from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


class AccessibilityFeature(IdMixin, Base):
	__tablename__ = "accessibility_features"

	feature: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
