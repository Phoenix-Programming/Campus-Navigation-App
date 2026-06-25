from __future__ import annotations
from sqlalchemy import Integer
from sqlalchemy.orm import Mapped, mapped_column


class IdMixin():
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
