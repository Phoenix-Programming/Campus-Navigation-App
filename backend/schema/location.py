from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

# Prevent circular import issues with type checking
if TYPE_CHECKING:
	from backend.schema.location_type import LocationType
	from backend.schema.closure import Closure
	from backend.schema.operating_hours import OperatingHours


class Location(IdMixin, Base):
	__tablename__ = "locations"

	location_type_id: Mapped[int] = mapped_column(ForeignKey("location_types.type"), nullable=False)
	name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	description: Mapped[str] = mapped_column(String)

	location_type: Mapped["LocationType"] = relationship(back_populates="locations", foreign_keys=[location_type_id])
	closures: Mapped[list["Closure"]] = relationship(back_populates="location")
	operating_hours: Mapped[list["OperatingHours"]] = relationship(back_populates="location")
