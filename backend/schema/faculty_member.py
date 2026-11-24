from __future__ import annotations
from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .faculty_member_in_departments import employees_in_departments
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.department import Department
	from backend.schema.room import Room


class FacultyMember(IdMixin, Base):
	__tablename__ = "faculty"

	room_id: Mapped[Optional[int]] = mapped_column(ForeignKey("rooms.id"), nullable=True)
	title: Mapped[str] = mapped_column(String(64), nullable=False)
	first_name: Mapped[str] = mapped_column(String(100), nullable=False)
	last_name: Mapped[str] = mapped_column(String(100), nullable=False)
	email: Mapped[Optional[str]] = mapped_column(String(256), unique=True, nullable=True)
	website: Mapped[Optional[str]] = mapped_column(String(300), unique=True, nullable=True)
	phone: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

	departments: Mapped[list["Department"]] = relationship(
     	secondary=employees_in_departments,
      	back_populates="faculty"
    )
	office: Mapped[Optional["Room"]] = relationship(back_populates="faculty", foreign_keys=[room_id])
