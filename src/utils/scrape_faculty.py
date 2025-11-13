import requests
import json
from bs4 import BeautifulSoup, Tag

type FacultyMember = dict[str, str]
type FacultyList = list[FacultyMember]

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

	# extract the faculty directory table
	first_element: Tag | None = soup.find('div', class_='myth pos1')
	if not first_element: return r"{}"

	table: Tag | None = first_element.parent
	if not table: return r"{}"

	# remove the table headers
	table_headers: list[Tag] = soup.find_all('div', class_='myth')
	for header in table_headers:
		header.decompose()

	# iterate over each faculty member's entry
	rows: list = list(table.children)
	faculty: FacultyList = []

	for i, row in enumerate(rows):
		# remove the labels
		labels: list[Tag] = row.find_all('span', class_='myLabel')
		for label in labels:
			label.decompose()

		# flatten the heirarchy
		rows[i] = row.find_all('div')
		rows[i] = sum([col.find_all(['span', 'a']) for col in row], [])

		# extract the faculty member's information
		page: str = rows[i][0]['href']
		name: str = rows[i][1].get_text()
		title: str = rows[i][2].get_text()
		email: str = rows[i][3].find('a').get_text()
		phone: str = rows[i][6].get_text()
		department: str = rows[i][7].get_text()
		office: str = rows[i][8].get_text()

		person: FacultyMember = {
			'name': name,
			'title': title,
			'department': department,
			'page': 'https://floridapoly.edu' + page,
			'email': email
		}
		if phone: person['phone'] = phone
		if office: person['office'] = office

		faculty.append(person)

	# convert the python dict to a JSON object
	json_obj: str = json.dumps(faculty)

	return json_obj
