from __future__ import annotations
from sqlalchemy import CheckConstraint, Column, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.utilities.db_connection import Base
from .mixins.id_mixin import IdMixin


permission_role_association_table: Table = Table(
	"permission_role_associations",
	Base.metadata,
	Column("role_id", Integer, ForeignKey("roles.id")),
	Column("permission_id", Integer, ForeignKey("permissions.id"))
)


class Role(IdMixin, Base):
    __tablename__ = "roles"

    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)

    permissions: Mapped[list[Permission]] = relationship(
		secondary=permission_role_association_table,
		back_populates="roles"
	)

    users: Mapped[list] = relationship("User", back_populates="role")

    __table_args__ = (
        CheckConstraint("name ~ '^[a-z_]+$'", name="role_format"),
    )


class Permission(IdMixin, Base):
    __tablename__ = "permissions"

    name: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(String(100), nullable=False)

    roles: Mapped[list[Role]] = relationship(
        "Role",
		secondary=permission_role_association_table,
		back_populates="permissions"
	)

    __table_args__ = (
        CheckConstraint("name ~ '^(?:create|read|update|delete):[a-z0-9_]+$'", name="name_format"),
    )
