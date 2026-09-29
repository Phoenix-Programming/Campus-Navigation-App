from __future__ import annotations
from sqlalchemy import ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .mixins.update_logging_mixin import UpdateLoggingMixin


class IndoorEdge(IdMixin, UpdateLoggingMixin, Base):
	__tablename__ = "indoor_edges"

	building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False)
	floor_id: Mapped[int] = mapped_column(ForeignKey("floors.id"), nullable=False)
	source_node_id: Mapped[int] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)
	target_node_id: Mapped[int] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)

	__table_args__: tuple = (
        UniqueConstraint("source_node_id", "target_node_id", name="uq_from_to"),
        Index('idx_indoor_edge_building_floor', 'building_id', 'floor_id'),
    )
