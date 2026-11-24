from dataclasses import dataclass


@dataclass
class ScrapedFacultyMember:
	first_name: str
	last_name: str
	title: str
	departments: list[str]
	website: str
	email: str
	phone: str | None
	office_name: str | None
