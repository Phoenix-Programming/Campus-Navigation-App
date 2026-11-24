from sqlalchemy import Column, ForeignKey, Table
from backend.utilities.db_connection import Base

employees_in_departments: Table = Table(
    "faculty_in_departments",
    Base.metadata,
    Column("id", ForeignKey("faculty.id")),
    Column("id", ForeignKey("departments.id")),
)
