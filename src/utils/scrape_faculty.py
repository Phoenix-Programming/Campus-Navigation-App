import requests
import json
from bs4 import BeautifulSoup, Tag

FACULTY_URL: str = 'https://floridapoly.edu/faculty/'
HEADERS: dict[str, str] = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

def get_faculty_list() -> str:
	"""Scrapes faculty information off of the Florida Poly Faculty & Staff Directory website

	Returns:
		str: A JSON object containing all faculty and staff and their information
	"""

	# pull the html content from the faculty page
	content: bytes = requests.get(FACULTY_URL, headers=HEADERS).content

	soup: BeautifulSoup = BeautifulSoup(content, 'html.parser')
	for tag in soup.find_all(style=True):
		del tag['style']
	soup.prettify()

	var_tag: Tag | None = soup.find("script", id="opted-static-directory-js-js-extra")
	if not var_tag:
		print("Script tag not found")
		return r'{}'

	variable: str = var_tag.text.strip()[31:-1]
	faculty_raw: list[dict[str, str]] = json.loads(variable)['data']['Report_Entry']
	faculty: list[dict[str, str | None]] = []

	for f in faculty_raw:
		faculty.append({
			'firstName': f.get('firstName'),
			'lastName': f.get('lastName'),
			'title': f.get('Title'),
			'department': f.get('Organizations_group'),
			'page': (
	   			'https://floridapoly.edu/faculty/bios/' + str(f.get('firstName')).replace(' ', '-') + '-' + str(f.get('lastName')).replace(' ', '-') + '/?email=' + str(f.get('email'))
		  		if f.get('firstName') and f.get('lastName') and f.get('email')
				else None
			),
			'email': f.get('email'),
			'phone': f.get('phone'),
			'officeLocation': f.get('Location'),
			'office': f.get('Office')
		})

	json_obj: str = json.dumps(faculty)

	return json_obj
