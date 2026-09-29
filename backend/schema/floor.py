from __future__ import annotations
from sqlalchemy import Float, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .mixins.update_logging_mixin import UpdateLoggingMixin


class Floor(IdMixin, UpdateLoggingMixin, Base):
	__tablename__ = "floors"

	building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False)
	floor_num: Mapped[int] = mapped_column(nullable=False)
	svg: Mapped[str] = mapped_column(String, nullable=False)

	__table_args__: tuple = (
        UniqueConstraint("building_id", "floor_num", name="uq_building_floor"),
    )
