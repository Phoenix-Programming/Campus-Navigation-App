from sqlalchemy import Column, ForeignKey, Table
from backend.utilities.db_connection import Base

employees_in_departments: Table = Table(
    "employees_in_departments",
    Base.metadata,
    Column("id", ForeignKey("employees.id")),
    Column("id", ForeignKey("departments.id")),
)
