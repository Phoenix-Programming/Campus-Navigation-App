from tabulate import tabulate
from backend.email_templates.departments_added_email import (
    DEPARTMENTS_ADDED_EMAIL_SUBJECT, DEPARTMENTS_ADDED_EMAIL_HTML
)
from backend.email_templates.departments_removed_email import (
	DEPARTMENTS_REMOVED_EMAIL_SUBJECT, DEPARTMENTS_REMOVED_EMAIL_HTML
)
from backend.email_templates.employees_added_email import (
	EMPLOYEES_ADDED_EMAIL_SUBJECT, EMPLOYEES_ADDED_EMAIL_HTML
)
from backend.email_templates.employees_removed_email import (
	EMPLOYEES_REMOVED_EMAIL_SUBJECT, EMPLOYEES_REMOVED_EMAIL_HTML
)
from backend.models.faculty import FacultyMember
from backend.repositories.interfaces.faculty_repository_interface import FacultyRepositoryInterface
from backend.schema.department import Department
from backend.schema.employee import Employee
from backend.settings import settings
from backend.utilities.scrape_faculty import get_faculty_list
from .interfaces.email_service_interface import EmailServiceInterface
from .interfaces.faculty_service_interface import FacultyServiceInterface


class FacultyService(FacultyServiceInterface):
	def __init__(
     	self,
      	faculty_repository: FacultyRepositoryInterface,
       	email_service: EmailServiceInterface
    ) -> None:
		self.faculty_repository: FacultyRepositoryInterface = faculty_repository
		self.email_service: EmailServiceInterface = email_service


	async def scrape_faculty_data(self) -> None:
		up_to_date_faculty: list[FacultyMember] = await get_faculty_list()  # TODO: Update get_faculty_list to return FacultyMembers instead of str

		# Gather department information
		up_to_date_departments: set[str] = set(
      		[d for fm in up_to_date_faculty for d in fm.departments]
        )
		existing_departments: list[Department] = (
      		await self.faculty_repository.get_all_departments()
		)
		existing_department_names: set[str] = set([d.name for d in existing_departments])
		new_department_names: set[str] = up_to_date_departments - existing_department_names
		stale_department_names: set[str] = existing_department_names - up_to_date_departments
		stale_departments: list[Department] = [
      		d for d in existing_departments
        	if d.name in stale_department_names
        ]

		# Add new departments
		new_departments: list[Department] = []

		for dn in new_department_names:
			new_departments.append(await self.faculty_repository.insert_department(dn))

		departments_added_formatted_content: str = self._format_departments_added_email(
      		new_departments
    	)

		# Gather employee information
		existing_employees: list[Employee] = await self.faculty_repository.get_all_employees()
		new_faculty: list[FacultyMember] = [
      		fm for fm in up_to_date_faculty
        	if self._does_scraped_faculty_member_exist(fm, existing_employees)
        ]
		stale_employees: list[Employee] = [
			e for e in existing_employees
			if self._is_employee_in_scraped_faculty_members(e, up_to_date_faculty)
		]

		# Add new employees
		employees_added: list[Employee] = []

		for fm in new_faculty:
			departments: list[Department] = [
       			d for d in existing_departments
          		if d.name in fm.departments
            ]

			room_id: int | FileNotFoundError = await self.faculty_repository.get_room_by_name(fm.office_name)

			employees_added.append(await self.faculty_repository.insert_employee(
				departments=departments,
				room_id=room_id,
				title = fm.title,
				first_name=fm.first_name,
				last_name=fm.last_name,
				email=fm.email,
				website=fm.website,
				phone=fm.phone
			))

		employees_added_formatted_content: str = self._format_employees_added_email(
			employees_added
		)

		# Remove stale employees
		employees_removed_formatted_content: str = self._format_employees_removed_email(
			stale_employees
		)

		for e in stale_employees:
			await self.faculty_repository.delete_employee(e)

		# Remove stale departments
		departments_removed_formatted_content: str = self._format_departments_removed_email(
      		stale_departments
        )

		for d in stale_departments:
			await self.faculty_repository.delete_department(d)

		# Send emails
		await self._send_faculty_scraping_update_emails(
			departments_added_formatted_content=departments_added_formatted_content,
			departments_removed_formatted_content=departments_removed_formatted_content,
			employees_added_formatted_content=employees_added_formatted_content,
			employees_removed_formatted_content=employees_removed_formatted_content
		)


	def _does_scraped_faculty_member_exist(
     	self,
      	faculty_member: FacultyMember,
       	employees: list[Employee]
    ) -> bool:
		for e in employees:
			if (
       			faculty_member.first_name == e.first_name and
          		faculty_member.last_name == e.last_name and
				faculty_member.title == e.title and
				set(faculty_member.departments) == set(e.departments) and
				faculty_member.email == e.email and
				faculty_member.phone == e.phone and
				faculty_member.website == e.website
			): return True

		return False


	def _is_employee_in_scraped_faculty_members(
     	self,
        employee: Employee,
        faculty_members: list[FacultyMember]
    ) -> bool:
		for fm in faculty_members:
			if (
       			fm.first_name == employee.first_name and
          		fm.last_name == employee.last_name and
				fm.title == employee.title and
				set(fm.departments) == set(employee.departments) and
				fm.email == employee.email and
				fm.phone == employee.phone and
				fm.website == employee.website
			): return True

		return False


	def _format_departments_added_email(self, departments: list[Department]) -> str:
		return DEPARTMENTS_ADDED_EMAIL_HTML.format(
			num_departments_added=len(departments),
			new_departments_table=tabulate(
       			[[d.name] for d in departments],
          		headers=["Department Name"],
            	tablefmt="html"
            )
		)


	def _format_departments_removed_email(self, departments: list[Department]) -> str:
		return DEPARTMENTS_REMOVED_EMAIL_HTML.format(
			num_departments_removed=len(departments),
			removed_departments_table=tabulate(
				[[d.name] for d in departments],
				headers=["Department Name"],
				tablefmt="html"
			)
		)


	def _format_employees_added_email(self, employees: list[Employee]) -> str:
		return EMPLOYEES_ADDED_EMAIL_HTML.format(
			num_employees_added=len(employees),
			new_employees_table=tabulate(
       			[[
					e.first_name,
					e.last_name,
					e.title,
					"; ".join([d.name for d in e.departments]),
					e.office.room.name if e.office is not None else None,
					e.email,
					e.phone,
					e.website
                ] for e in employees],
          		headers=[
                	"FName",
					"LName",
					"Title(s)",
					"Department(s)",
					"Office",
					"Email",
					"Phone",
					"Website"
     			],
            	tablefmt="html"
            )
		)


	def _format_employees_removed_email(self, employees: list[Employee]) -> str:
		return EMPLOYEES_REMOVED_EMAIL_HTML.format(
			num_employees_removed=len(employees),
			removed_employees_table=tabulate(
       			[[
					e.first_name,
					e.last_name,
					e.title,
					"; ".join([d.name for d in e.departments]),
					e.office.room.name if e.office is not None else None,
					e.email,
					e.phone,
					e.website
                ] for e in employees],
          		headers=[
                	"FName",
					"LName",
					"Title(s)",
					"Department(s)",
					"Office",
					"Email",
					"Phone",
					"Website"
     			],
            	tablefmt="html"
            )
		)


	async def _send_faculty_scraping_update_emails(
     	self,
      	departments_added_formatted_content: str | None,
      	departments_removed_formatted_content: str | None,
      	employees_added_formatted_content: str | None,
      	employees_removed_formatted_content: str | None
    ) -> None:
		for subject, content in [
      		(DEPARTMENTS_ADDED_EMAIL_SUBJECT, departments_added_formatted_content),
      		(DEPARTMENTS_REMOVED_EMAIL_SUBJECT, departments_removed_formatted_content),
      		(EMPLOYEES_ADDED_EMAIL_SUBJECT, employees_added_formatted_content),
      		(EMPLOYEES_REMOVED_EMAIL_SUBJECT, employees_removed_formatted_content)
        ]:
			await self.email_service.send_email(
				to=settings.mail_support_email,
				subject=subject,
				html_content=content
			)
