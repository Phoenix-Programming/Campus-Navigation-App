from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Time, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from backend.models.day_of_week import DayOfWeek

# Prevent circular import issues by checking if TYPE_CHECKING was already imported
if TYPE_CHECKING:
	from backend.schema.location import Location


class OperatingHours(IdMixin, Base):
	__tablename__ = "operating_hours"

	location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
	day_of_week: Mapped[Enum] = mapped_column(Enum(DayOfWeek), nullable=False)
	open_time: Mapped[Time] = mapped_column(Time, nullable=False)
	close_time: Mapped[Time] = mapped_column(Time, nullable=False)

	location: Mapped["Location"] = relationship(back_populates="operating_hours", foreign_keys=[location_id])
