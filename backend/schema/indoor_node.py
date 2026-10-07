from __future__ import annotations
from sqlalchemy import Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.schema.building_category import BuildingCategory
from backend.schema.node_type import NodeType
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .mixins.update_logging_mixin import UpdateLoggingMixin


class IndoorNode(IdMixin, UpdateLoggingMixin, Base):
	__tablename__ = "indoor_nodes"

	building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False)
	floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False)
	node_type_id: Mapped[int] = mapped_column(ForeignKey("node_types.id"), nullable=False)
	label: Mapped[str] = mapped_column(String, nullable=True)
	x: Mapped[float] = mapped_column(Float, nullable=False)
	y: Mapped[float] = mapped_column(Float, nullable=False)

	__table_args__ = (
        Index('idx_indoor_node_building_floor', 'building_id', 'floor_id'),
    )

	node_type: Mapped["NodeType"] = relationship()
