from __future__ import annotations
from sqlalchemy import Boolean, CheckConstraint, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin
from .active_refresh_token import ActiveRefreshToken
from .password_reset_token import PasswordResetToken
from .permissions import Role

class User(IdMixin, Base):
    __tablename__ = "users"

    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(200), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    role: Mapped[Role] = relationship("Role", back_populates="users")

    reset_tokens: Mapped[list[PasswordResetToken]] = relationship(
        "PasswordResetToken",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    active_refresh_tokens: Mapped[list[ActiveRefreshToken]] = relationship(
        "ActiveRefreshToken",
        cascade="all, delete-orphan",
        passive_deletes=True
    )

    __table_args__ = (
        CheckConstraint(username.op("~")(r"^[a-zA-Z0-9\-\_\.]+$"), name="username_format"),
        CheckConstraint(
            email.op("~")(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"),
            name="email_format"
        )
    )
