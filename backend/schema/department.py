from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .faculty_member_in_departments import employees_in_departments
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.faculty_member import FacultyMember


class Department(IdMixin, Base):
	__tablename__ = "departments"

	name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

	employees: Mapped[list["FacultyMember"]] = relationship(
     	secondary=employees_in_departments,
		back_populates="departments"
    )
