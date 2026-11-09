from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.schema.location import Location


class ParkingLot(Location):
	__tablename__ = "parking_lots"

	location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), primary_key=True)
	code: Mapped[str] = mapped_column(String(10), nullable=False)

	__mapper_args__ = {
		"polymorphic_identity": "parking_lots"
	}
