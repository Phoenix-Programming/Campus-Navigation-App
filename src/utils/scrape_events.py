import ast
import requests
import json
from bs4 import BeautifulSoup

CAMPUS_INFO_URL: str = 'https://api.presence.io/floridapoly/v1/app/campus'
EVENTS_URL: str = 'https://api.presence.io/floridapoly/v1/events'
HEADERS: dict[str, str] = {
	'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

_have_campus_info: bool = False
_api_id: str
_cdn: str
_portal_link: str

def getEvents() -> str:
	"""Fetchs all campus events from Involve web server

	Returns:
		str: A JSON object containing all campus events
	"""

	# fetch the campus info if we don't already have it
	if not _have_campus_info: _getCampusInfo()
	if not _have_campus_info: return r'{}'

    # fetch the JSON content from the Involve web server
	content: bytes = requests.get(EVENTS_URL, headers=HEADERS).content

	# wasn't able to parse the JSON itself, it may not be formatted properly or unable
 	# to parse the HTML descriptions, so I just pull it from the html
	soup: BeautifulSoup = BeautifulSoup(content, 'html.parser')
	soup.prettify()

	# iterate over each event
	events: list[str] = str(soup).split('{"apiId":')[1:]
	events_list: list[dict[str, str | list[str]]] = []

	for event in events:
		# don't capture the event if it is already over
		if ',"hasEventEnded":true' in event: continue

		# determine if optional fields are included
		has_description: bool = ',"description":' in event
		has_contact_name: bool = ',"contactName":' in event
		has_contact_email: bool = ',"contactEmail":' in event
		has_rsvp_link: bool = ',"rsvpLink":' in event

		# extract the event information
		uri: str = str(_capture_content(event, "uri", "subdomain"))
		name: str = str(_capture_content(event, "eventName", "organizationName"))
		org: str = str(_capture_content(event, "organizationName", "organizationUri"))
		org_uri: str = str(_capture_content(event, "organizationUri", "orgStructureNoSqlId"))
		description: str = str(_capture_content(event, "description", "location") if has_description else '')
		location: str = str(_capture_content(event, "location", "isVirtualEventLink"))
		photo_uri: str = str(_capture_content(event, "photoUriWithVersion", "startDateTimeUtc"))
		start_date_time_utc: str = str(_capture_content(event, "startDateTimeUtc", "endDateTimeUtc"))
		end_date_time_utc: str = str(_capture_content(event, "endDateTimeUtc", "statusId"))
		tags: list[str] = list(_capture_content(event, "tags", ""))

		contact_name: str = ''
		contact_email: str = ''
		rsvp_link: str = ''
		if has_contact_name: contact_name = str(_capture_content(event, "contactName", "contactEmail" if has_contact_email else "hasCoverImage"))
		if has_contact_email: contact_email = str(_capture_content(event, "contactEmail", "hasCoverImage"))
		if has_rsvp_link: rsvp_link = str(_capture_content(event, "rsvpLink", "rsvpStatus"))

		event_dict: dict[str, str | list[str]] = {
			"url": _portal_link + 'event/' + uri,
			"name": name,
			"org": org,
			"org_url": _portal_link + 'organization/' + org_uri,
			"location": location,
			"photoUrl": _cdn + 'event-photos/' + _api_id + '/' + photo_uri,
			"startDateTimeUtc": start_date_time_utc,
			"endDateTimeUtc": end_date_time_utc
		}

		if has_description: event_dict["description"] = description
		if has_contact_name: event_dict["contactName"] = contact_name
		if has_contact_email: event_dict["contactEmail"] = contact_email
		if has_rsvp_link and rsvp_link: event_dict["rsvpLink"] = rsvp_link
		if tags != []: event_dict["tags"] = tags

		events_list.append(event_dict)

	# convert the Python dictionary to a JSON string
	json_obj: str = json.dumps(events_list)

	return json_obj

def _getCampusInfo() -> None:
	"""Fetches the API ID, CDN, and portal link from Involve"""

	global _api_id, _cdn, _portal_link, _have_campus_info

	# fetch the campus info from the Involve web server
	content: bytes = requests.get(CAMPUS_INFO_URL, headers=HEADERS).content

	json_obj: str | None = BeautifulSoup(content, 'html.parser').string
	if not json_obj: return

	# extract the campus info
	_api_id = str(_capture_content(json_obj, 'apiId', 'structureNoSqlId'))
	_cdn = str(_capture_content(json_obj, 'cdn', 'portalLink'))
	_portal_link = str(_capture_content(json_obj, 'portalLink', 'useLegacyAuth'))

	# ensure the URLs end in a backslash
	if _cdn[-1] != '/': _cdn += '/'
	if _portal_link[-1] != '/': _portal_link += '/'

	# mark that the campus info has been fetched
	_have_campus_info = True

def _capture_content(context: str, pre: str, post: str) -> str | list[str]:
	"""Extracts a value from the given context via the key for the value and the key that follows the value

	Args:
		context (str): The context to extract the value from
		pre (str): The key of the value
		post (str): The key following the value

	Returns:
		str | list[str]: The value between the given keys in the context
	"""

	# get the start and end indices for the value
	start: int = context.find(f'"{pre}":') + len(pre) + 3
	end: int = context.find(f',"{post}":') if post else -2

	# extract the value
	content: str = context[start : end]

	# if the content being extracted is the description, remove the surrounding quotes
	if pre == "description": return content[1:-1]

	# convert the string list into a list of strings
	return ast.literal_eval(content)
