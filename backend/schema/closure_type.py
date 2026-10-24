from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

# Prevent circular import issues with type checking
if TYPE_CHECKING:
	from backend.schema.closure import Closure


class ClosureType(IdMixin, Base):
	__tablename__ = "closure_types"

	type: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)

	closures: Mapped[list["Closure"]] = relationship(back_populates="closure_type")
