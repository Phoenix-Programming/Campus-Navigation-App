from sqlalchemy import Result, select
from backend.exceptions import DepartmentNotFoundError, RoomNotFoundError
from backend.schema.department import Department
from backend.schema.employee import Employee
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


	async def get_all_employees(self) -> list[Employee]:
		result: Result[Employee] = await self.db.execute(select(Employee))

		return list(result.scalars().all())


	async def insert_employee(
     	self,
      	departments: list[Department],
        title: str,
        first_name: str,
        last_name: str,
       	room_id: int | None = None,
        email: str | None = None,
        website: str | None = None,
        phone: str | None = None
    ) -> Employee:
		new_employee: Employee = Employee(
			room_id=room_id,
			title=title,
			first_name=first_name,
			last_name=last_name,
			email=email,
			website=website,
			phone=phone
		)
		self.db.add(new_employee)

		new_employee.departments.extend(departments)

		try:
			await self.db.commit()
			await self.db.refresh(new_employee)

			return new_employee
		except:
			await self.db.rollback()
			raise


	async def delete_employee(self, employee: Employee) -> None:
		await self.db.delete(employee)

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
