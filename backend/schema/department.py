from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.employee import Employee
	from backend.schema.office import Office


class Department(IdMixin, Base):
	__tablename__ = "departments"

	name: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

	employees: Mapped[list["Employee"]] = relationship(back_populates="department")
	offices: Mapped[list["Office"]] = relationship(back_populates="department")
