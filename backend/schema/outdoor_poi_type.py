from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


class OutdoorPOIType(IdMixin, Base):
	__tablename__ = "outdoor_poi_types"

	type: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
