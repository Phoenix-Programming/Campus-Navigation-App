from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.outdoor_poi import OutdoorPOI


class OutdoorPOIType(IdMixin, Base):
	__tablename__ = "outdoor_poi_types"

	type: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)

	outdoor_pois: Mapped[list["OutdoorPOI"]] = relationship(back_populates="outdoor_poi_type")
