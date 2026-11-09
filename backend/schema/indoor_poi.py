from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.indoor_poi_type import IndoorPOIType
	from backend.schema.building import Building


class IndoorPOI(IdMixin, Base):
	__tablename__ = "indoor_pois"

	indoor_poi_type_id: Mapped[int] = mapped_column(ForeignKey("indoor_poi_types.type"), nullable=False)
	bld_id: Mapped[int] = mapped_column(ForeignKey("buildings.location_id"), nullable=False)

	indoor_poi_type: Mapped["IndoorPOIType"] = relationship(back_populates="indoor_pois", foreign_keys=[indoor_poi_type_id])
	building: Mapped["Building"] = relationship(back_populates="indoor_pois", foreign_keys=[bld_id])
