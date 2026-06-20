from dataclasses import dataclass
from backend.repositories.schema.user import User

@dataclass
class CurrentUserContext:
	user: User
	permissions: set[str]
