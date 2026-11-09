from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.outdoor_poi_type import OutdoorPOIType


class OutdoorPOI(IdMixin, Base):
	__tablename__ = "outdoor_pois"

	outdoor_poi_type_id: Mapped[int] = mapped_column(ForeignKey("outdoor_poi_types.type"), nullable=False)

	outdoor_poi_type: Mapped["OutdoorPOIType"] = relationship(back_populates="outdoor_pois", foreign_keys=[outdoor_poi_type_id])
