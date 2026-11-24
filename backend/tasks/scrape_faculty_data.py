import re
import requests
import json
from bs4 import BeautifulSoup, Tag
from backend.models.faculty import ScrapedFacultyMember
from backend.routes.dependencies import FacultyServiceDep as FacultyService


FACULTY_URL: str = 'https://floridapoly.edu/faculty/'
HEADERS: dict[str, str] = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}


async def scrape_faculty_data(faculty_service: FacultyService) -> None:
	"""Scrapes faculty information off of the Florida Poly Faculty & Staff Directory website"""

	try:
		content: bytes = requests.get(FACULTY_URL, headers=HEADERS).content

		soup: BeautifulSoup = BeautifulSoup(content, 'html.parser')
		for tag in soup.find_all(style=True):
			del tag['style']
		soup.prettify()

		var_tag: Tag | None = soup.find("script", id="opted-static-directory-js-js-extra")
		if not var_tag: return None

		variable: str = var_tag.text[var_tag.text.index('{'):var_tag.text.rindex(';')]
		faculty_raw: list[dict[str, str]] = json.loads(variable)['data']['Report_Entry']
		faculty: list[ScrapedFacultyMember] = []

		for f in faculty_raw:
			first_name: str | None = f.get('firstName')
			if first_name is None: raise ValueError("first_name cannot be None")

			last_name: str | None = f.get('lastName')
			if last_name is None: raise ValueError("last_name cannot be None")

			title: str | None = f.get('Title')
			if title is None: raise ValueError("title cannot be None")

			departments_raw: str | None = f.get('Organizations_group')
			if departments_raw is None: raise ValueError("departments_raw cannot be None")
			departments: list[str] = [d.strip() for d in re.split(r'[,;]+', departments_raw)]

			email: str | None = f.get('email')
			if email is None: raise ValueError("email cannot be None")

			website: str = (
				'https://floridapoly.edu/faculty/bios/' +
				first_name.replace(' ', '-') +
				'-' +
				last_name.replace(' ', '-') +
				'/?email=' +
				email
			)
			phone: str | None = f.get('phone')
			if not phone: phone = None

			office_name: str | None = f.get('Office')
			if not office_name: office_name = None

			faculty.append(ScrapedFacultyMember(
				first_name=first_name,
				last_name=last_name,
				title=title,
				departments=departments,
				website=website,
				email=email,
				phone=phone,
				office_name=office_name
			))

		await faculty_service.update_faculty_data(up_to_date_faculty=faculty)
	except Exception as e:
		await faculty_service.send_faculty_web_scraping_error(error=e)
