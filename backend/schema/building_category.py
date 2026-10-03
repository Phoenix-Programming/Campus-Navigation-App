from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.building import Building


class BuildingCategory(IdMixin, Base):
	__tablename__ = "building_categories"

	category: Mapped[str] = mapped_column(String, unique=True, nullable=False)
	buildings: Mapped[list["Building"]] = relationship(back_populates="building_category")
