from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.department import Department
	from backend.schema.employee import Employee
	from backend.schema.office_category import OfficeCategory
	from backend.schema.room import Room


class Office(IdMixin, Base):
	__tablename__ = "offices"

	room_id: Mapped[int] = mapped_column(ForeignKey("rooms.id"), nullable=False)
	office_category_id: Mapped[int] = mapped_column(ForeignKey("office_categories.id"), nullable=False)
	department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)

	room: Mapped["Room"] = relationship(back_populates="offices", foreign_keys=[room_id])
	office_category: Mapped["OfficeCategory"] = relationship(back_populates="offices", foreign_keys=[office_category_id])
	department: Mapped["Department"] = relationship(back_populates="offices", foreign_keys=[department_id])

	employees: Mapped[list["Employee"]] = relationship(back_populates="office")