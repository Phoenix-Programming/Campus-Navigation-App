from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.indoor_poi import IndoorPOI


class IndoorPOIType(IdMixin, Base):
	__tablename__ = "indoor_poi_types"

	type: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
	
	indoor_pois: Mapped[list["IndoorPOI"]] = relationship(back_populates="indoor_poi_type")
