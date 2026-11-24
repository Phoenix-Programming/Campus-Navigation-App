from datetime import datetime
from tabulate import tabulate
from backend.email_templates.departments_added_email import (
    DEPARTMENTS_ADDED_EMAIL_SUBJECT, DEPARTMENTS_ADDED_EMAIL_HTML
)
from backend.email_templates.departments_removed_email import (
	DEPARTMENTS_REMOVED_EMAIL_SUBJECT, DEPARTMENTS_REMOVED_EMAIL_HTML
)
from backend.email_templates.faculty_added_email import (
	FACULTY_ADDED_EMAIL_SUBJECT, FACULTY_ADDED_EMAIL_HTML
)
from backend.email_templates.faculty_removed_email import (
	FACULTY_REMOVED_EMAIL_SUBJECT, FACULTY_REMOVED_EMAIL_HTML
)
from backend.email_templates.faculty_web_scraping_error_email import (
	FACULTY_WEB_SCRAPING_ERROR_EMAIL_SUBJECT, FACULTY_WEB_SCRAPING_ERROR_EMAIL_BODY
)
from backend.models.faculty import ScrapedFacultyMember
from backend.repositories.interfaces.faculty_repository_interface import FacultyRepositoryInterface
from backend.schema.department import Department
from backend.schema.faculty_member import FacultyMember
from backend.schema.room import Room
from backend.settings import settings
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


	async def update_faculty_data(self, up_to_date_faculty: list[ScrapedFacultyMember]) -> None:
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

		# Gather faculty information
		existing_faculty: list[FacultyMember] = await self.faculty_repository.get_all_faculty()
		new_faculty: list[ScrapedFacultyMember] = [
      		fm for fm in up_to_date_faculty
        	if not self._does_scraped_faculty_member_exist(fm, existing_faculty)
        ]
		stale_faculty: list[FacultyMember] = [
			e for e in existing_faculty
			if not self._is_faculty_member_in_scraped_faculty_members(e, up_to_date_faculty)
		]

		# Add new faculty
		faculty_added: list[FacultyMember] = []

		for fm in new_faculty:
			departments: list[Department] = [
       			d for d in existing_departments
          		if d.name in fm.departments
            ]

			room: Room | None = (
       			await self.faculty_repository.get_room_by_name(fm.office_name)
   				if fm.office_name is not None else None
			)

			faculty_added.append(await self.faculty_repository.insert_faculty_member(
				departments=departments,
				room=room,
				title=fm.title,
				first_name=fm.first_name,
				last_name=fm.last_name,
				email=fm.email,
				website=fm.website,
				phone=fm.phone
			))

		faculty_added_formatted_content: str = self._format_faculty_added_email(
			faculty_added
		)

		# Remove stale faculty
		faculty_removed_formatted_content: str = self._format_faculty_removed_email(
			stale_faculty
		)

		for e in stale_faculty:
			await self.faculty_repository.delete_faculty_member(e)

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
			faculty_added_formatted_content=faculty_added_formatted_content,
			faculty_removed_formatted_content=faculty_removed_formatted_content
		)


	async def send_faculty_web_scraping_error(self, error: Exception) -> None:
		await self.email_service.send_email(
			to=settings.mail_support_email,
			subject=FACULTY_WEB_SCRAPING_ERROR_EMAIL_SUBJECT,
			plain_text=FACULTY_WEB_SCRAPING_ERROR_EMAIL_BODY.format(
				fail_time=datetime.now().astimezone(),
				error=str(error)
			)
		)


	def _does_scraped_faculty_member_exist(
     	self,
      	faculty_member: ScrapedFacultyMember,
       	faculty: list[FacultyMember]
    ) -> bool:
		for e in faculty:
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


	def _is_faculty_member_in_scraped_faculty_members(
     	self,
        faculty_member: FacultyMember,
        faculty_members: list[ScrapedFacultyMember]
    ) -> bool:
		for fm in faculty_members:
			if (
       			fm.first_name == faculty_member.first_name and
          		fm.last_name == faculty_member.last_name and
				fm.title == faculty_member.title and
				set(fm.departments) == set(faculty_member.departments) and
				fm.email == faculty_member.email and
				fm.phone == faculty_member.phone and
				fm.website == faculty_member.website
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


	def _format_faculty_added_email(self, faculty: list[FacultyMember]) -> str:
		return FACULTY_ADDED_EMAIL_HTML.format(
			num_faculty_added=len(faculty),
			new_faculty_table=tabulate(
       			[[
					e.first_name,
					e.last_name,
					e.title,
					"; ".join([d.name for d in e.departments]),
					e.office.name if e.office is not None else None,
					e.email,
					e.phone,
					e.website
                ] for e in faculty],
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


	def _format_faculty_removed_email(self, faculty: list[FacultyMember]) -> str:
		return FACULTY_REMOVED_EMAIL_HTML.format(
			num_faculty_removed=len(faculty),
			removed_faculty_table=tabulate(
       			[[
					e.first_name,
					e.last_name,
					e.title,
					"; ".join([d.name for d in e.departments]),
					e.office.name if e.office is not None else None,
					e.email,
					e.phone,
					e.website
                ] for e in faculty],
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
      	faculty_added_formatted_content: str | None,
      	faculty_removed_formatted_content: str | None
    ) -> None:
		for subject, content in [
      		(DEPARTMENTS_ADDED_EMAIL_SUBJECT, departments_added_formatted_content),
      		(DEPARTMENTS_REMOVED_EMAIL_SUBJECT, departments_removed_formatted_content),
      		(FACULTY_ADDED_EMAIL_SUBJECT, faculty_added_formatted_content),
      		(FACULTY_REMOVED_EMAIL_SUBJECT, faculty_removed_formatted_content)
        ]:
			await self.email_service.send_email(
				to=settings.mail_support_email,
				subject=subject,
				html_content=content
			)
