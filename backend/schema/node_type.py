from __future__ import annotations

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


class NodeType(IdMixin, Base):
	__tablename__ = "node_types"

	type: Mapped[str] = mapped_column(String, unique=True, nullable=False)

