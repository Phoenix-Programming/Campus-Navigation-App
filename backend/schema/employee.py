from __future__ import annotations
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin

if TYPE_CHECKING:
	from backend.schema.department import Department
	from backend.schema.office import Office


class Employee(IdMixin, Base):
	__tablename__ = "employees"

	department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
	office_id: Mapped[int] = mapped_column(ForeignKey("offices.id"), nullable=False)
	title: Mapped[str] = mapped_column(String(64), nullable=False)
	first_name: Mapped[str] = mapped_column(String(100), nullable=False)
	last_name: Mapped[str] = mapped_column(String(100), nullable=False)
	email: Mapped[str] = mapped_column(String(256), unique=True, nullable=True)
	website: Mapped[str] = mapped_column(String(300), unique=True, nullable=True)
	phone: Mapped[str] = mapped_column(String(10), nullable=True)

	department: Mapped["Department"] = relationship(back_populates="employees", foreign_keys=[department_id])
	office: Mapped["Office"] = relationship(back_populates="employees", foreign_keys=[office_id])
