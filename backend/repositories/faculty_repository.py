from sqlalchemy import Result, select
from backend.exceptions import DepartmentNotFoundError, RoomNotFoundError
from backend.schema.department import Department
from backend.schema.faculty_member import FacultyMember
from backend.schema.room import Room
from backend.utilities.db_connection import Database
from .interfaces.faculty_repository_interface import FacultyRepositoryInterface


class FacultyRepository(FacultyRepositoryInterface):
	def __init__(self, db: Database):
		self.db = db


	async def get_all_departments(self) -> list[Department]:
		result: Result[Department] = await self.db.execute(select(Department))

		return list(result.scalars().all())


	async def get_department_by_name(self, name: str) -> Department | None:
		result: Result[Department] = await self.db.execute(
      		select(Department).where(Department.name == name)
        )

		department: Department | None = result.scalar_one_or_none()

		if department is None: raise DepartmentNotFoundError(name)

		return department


	async def insert_department(self, name: str) -> Department:
		new_department: Department = Department(name=name)
		self.db.add(new_department)

		try:
			await self.db.commit()
			await self.db.refresh(new_department)

			return new_department
		except:
			await self.db.rollback()
			raise


	async def delete_department(self, department: Department) -> None:
		await self.db.delete(department)

		try:
			await self.db.commit()
		except:
			await self.db.rollback()
			raise


	async def get_all_faculty(self) -> list[FacultyMember]:
		result: Result[FacultyMember] = await self.db.execute(select(FacultyMember))

		return list(result.scalars().all())


	async def insert_faculty_member(
     	self,
      	departments: list[Department],
        title: str,
        first_name: str,
        last_name: str,
       	room: Room | None = None,
        email: str | None = None,
        website: str | None = None,
        phone: str | None = None
    ) -> FacultyMember:
		new_faculty_member: FacultyMember = FacultyMember(
			room_id=room.location_id if room is not None else None,
			title=title,
			first_name=first_name,
			last_name=last_name,
			email=email,
			website=website,
			phone=phone
		)
		self.db.add(new_faculty_member)

		new_faculty_member.departments.extend(departments)

		try:
			await self.db.commit()
			await self.db.refresh(new_faculty_member)

			return new_faculty_member
		except:
			await self.db.rollback()
			raise


	async def delete_faculty_member(self, faculty_member: FacultyMember) -> None:
		await self.db.delete(faculty_member)

		try:
			await self.db.commit()
		except:
			await self.db.rollback()
			raise


	async def get_room_by_name(self, name: str) -> Room | None:
		result: Result[Room] = await self.db.execute(
      		select(Room).where(Room.name == name)
        )

		room: Room | None = result.scalar_one_or_none()

		if room is None: raise RoomNotFoundError(name)

		return room
