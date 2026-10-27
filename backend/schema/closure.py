from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

# Prevent circular import issues by checking if TYPE_CHECKING was already imported
if TYPE_CHECKING:
	from backend.schema.location import Location
	from backend.schema.closure_type import ClosureType


class Closure(IdMixin, Base):
	__tablename__ = "closures"

	closure_type_id: Mapped[int] = mapped_column(ForeignKey("closure_types.type"), nullable=False)
	location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), nullable=False)
	valid_from: Mapped[TIMESTAMP] = mapped_column(TIMESTAMP)
	valid_until: Mapped[TIMESTAMP] = mapped_column(TIMESTAMP)

	closure_type: Mapped["ClosureType"] = relationship(back_populates="closures", foreign_keys=[closure_type_id])
	location: Mapped["Location"] = relationship(back_populates="closures", foreign_keys=[location_id])
