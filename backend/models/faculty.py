from dataclasses import dataclass


@dataclass
class FacultyMember:
	first_name: str
	last_name: str
	title: str
	departments: list[str]
	website: str
	email: str | None
	phone: str | None
	office_name: str | None
