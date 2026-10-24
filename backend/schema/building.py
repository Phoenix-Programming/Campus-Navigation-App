from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .mixins.update_logging_mixin import UpdateLoggingMixin

# Prevent circular import issues with type checking
if TYPE_CHECKING:
	from backend.schema.building_category import BuildingCategory
	from backend.schema.floor import Floor
from backend.schema.location import Location


class Building(UpdateLoggingMixin, Location):
	__tablename__ = "buildings"

	location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), primary_key=True)
	code: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
	address: Mapped[str] = mapped_column(String, nullable=False)
	category_id: Mapped[int] = mapped_column(ForeignKey("building_categories.id"), nullable=False)
	num_floors: Mapped[int] = mapped_column(nullable=False)

	building_category: Mapped["BuildingCategory"] = relationship(back_populates="buildings", foreign_keys=[category_id])
	floors: Mapped[list["Floor"]] = relationship(back_populates="building")

	__mapper_args__ = {
        "polymorphic_identity": "building"
    }
