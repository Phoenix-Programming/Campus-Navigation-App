from sqlalchemy import Result, select
from backend.exceptions import DepartmentNotFoundError, OfficeNotFoundError, EmployeeNotFoundError
from backend.schema.department import Department
from backend.schema.employee import Employee
from backend.schema.office import Office
from backend.utilities.db_connection import Database
from .interfaces.faculty_repository_interface import FacultyRepositoryInterface


class FacultyRepository(FacultyRepositoryInterface):
	def __init__(self, db: Database):
		self.db = db


	async def get_department_by_id(self, department_id: int) -> Department | None:
		result: Result[Department] = await self.db.execute(
      		select(Department).where(Department.id == department_id)
        )

		return result.scalars().first()


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


	async def delete_department(self, department_id: int) -> None:
		result: Result[Department] = await self.db.execute(
      		select(Department).where(Department.id == department_id)
		)
		department: Department | None = result.scalars().first()

		if department is None: raise DepartmentNotFoundError(department_id)

		await self.db.delete(department)

		try:
			await self.db.commit()
		except:
			await self.db.rollback()
			raise


	async def insert_office(self, room_id: int, office_category_id: int, department_id: int) -> None:
		from backend.schema.office import Office

		new_office: Office = Office(
			room_id=room_id,
			office_category_id=office_category_id,
			department_id=department_id
		)
		self.db.add(new_office)

		try:
			await self.db.commit()
			await self.db.refresh(new_office)
		except:
			await self.db.rollback()
			raise


	async def delete_office(self, office_id: int) -> None:
		result: Result[Office] = await self.db.execute(
      		select(Office).where(Office.id == office_id)
        )
		office: Office | None = result.scalars().first()

		if office is None: raise OfficeNotFoundError(office_id)

		await self.db.delete(office)

		try:
			await self.db.commit()
		except:
			await self.db.rollback()
			raise


	async def insert_employee(
     	self,
      	department_id: int,
       	office_id: int,
        title: str,
        first_name: str,
        last_name: str,
        email: str | None = None,
        website: str | None = None,
        phone: str | None = None
    ) -> None:
		new_employee: Employee = Employee(
			department_id=department_id,
			office_id=office_id,
			title=title,
			first_name=first_name,
			last_name=last_name,
			email=email,
			website=website,
			phone=phone
		)
		self.db.add(new_employee)

		try:
			await self.db.commit()
			await self.db.refresh(new_employee)
		except:
			await self.db.rollback()
			raise


	async def update_employee(
	 	self,
		employee_id: int,
       	department_id: int | None = None,
	  	office_id: int | None = None,
	  	title: str | None = None,
	  	first_name: str | None = None,
	  	last_name: str | None = None,
	  	email: str | None = None,
	  	website: str | None = None,
	  	phone: str | None = None
	) -> Employee:
		result: Result[Employee] = await self.db.execute(
	  		select(Employee).where(Employee.id == employee_id)
		)
		employee: Employee | None = result.scalars().first()

		if employee is None: raise EmployeeNotFoundError(employee_id)

		if department_id is not None: employee.department_id = department_id
		if office_id is not None: employee.office_id = office_id
		if title is not None: employee.title = title
		if first_name is not None: employee.first_name = first_name
		if last_name is not None: employee.last_name = last_name
		if email is not None: employee.email = email
		if website is not None: employee.website = website
		if phone is not None: employee.phone = phone

		try:
			await self.db.commit()
			await self.db.refresh(employee)

			return employee
		except:
			await self.db.rollback()
			raise


	async def delete_employee(self, employee_id: int) -> None:
		result: Result[Employee] = await self.db.execute(
	  		select(Employee).where(Employee.id == employee_id)
		)
		employee: Employee | None = result.scalars().first()

		if employee is None: raise EmployeeNotFoundError(employee_id)

		await self.db.delete(employee)

		try:
			await self.db.commit()
		except:
			await self.db.rollback()
			raise
