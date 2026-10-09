from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


class OfficeCategory(IdMixin, Base):
	__tablename__ = "office_categories"

	category: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
