from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.location import Location


class LocationType(IdMixin, Base):
	__tablename__ = "location_types"

	type: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)

	locations: Mapped[list["Location"]] = relationship(back_populates="location_type")
