from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

# Prevent circular import issues with type checking
if TYPE_CHECKING:
    from backend.schema.building import Building
    from backend.schema.indoor_node import IndoorNode
    from backend.schema.room_type import RoomType
from backend.schema.location import Location


class Room(Location):
    __tablename__ = "rooms"

    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"), primary_key=True)
    building_id: Mapped[int] = mapped_column(ForeignKey("buildings.id"), nullable=False)
    room_type_id: Mapped[int] = mapped_column(ForeignKey("room_type.id"), nullable=False)
    indoor_node_id: Mapped[int] = mapped_column(ForeignKey("indoor_nodes.id"), nullable=False)
    identifier_name: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    official_name: Mapped[str] = mapped_column(String, nullable=False)

    building: Mapped["Building"] = relationship(back_populates="rooms", foreign_keys=[building_id])
    room_type: Mapped["RoomType"] = relationship(back_populates="rooms", foreign_keys=[room_type_id])
    indoor_node: Mapped["IndoorNode"] = relationship(back_populates="rooms", foreign_keys=[indoor_node_id])
