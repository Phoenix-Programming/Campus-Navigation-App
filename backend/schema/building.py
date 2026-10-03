from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .mixins.update_logging_mixin import UpdateLoggingMixin

# Prevent circular import issues with type checking
if TYPE_CHECKING:
	from backend.schema.building_category import BuildingCategory
	from backend.schema.floor import Floor


class Building(IdMixin, UpdateLoggingMixin, Base):
	__tablename__ = "buildings"

	name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	code: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
	address: Mapped[str] = mapped_column(String, nullable=False)
	category_id: Mapped[int] = mapped_column(ForeignKey("building_categories.id"), nullable=False)
	num_floors: Mapped[int] = mapped_column(nullable=False)

	building_category: Mapped["BuildingCategory"] = relationship(back_populates="buildings", foreign_keys=[category_id])
	floors: Mapped[list["Floor"]] = relationship(back_populates="building")
