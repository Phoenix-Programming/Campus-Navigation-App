from __future__ import annotations
from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .mixins.update_logging_mixin import UpdateLoggingMixin


class Building(IdMixin, UpdateLoggingMixin, Base):
	__tablename__ = "buildings"

	name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	code: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
	num_floors: Mapped[int] = mapped_column(nullable=False)
