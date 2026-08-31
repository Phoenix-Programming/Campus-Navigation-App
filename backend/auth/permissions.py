from fastapi import HTTPException, status
from .auth import CurrentUser
from .current_user_context import CurrentUserContext

class RequiredPermissions:
	def __init__(self, *required_permissions: str) -> None:
		self._required_permissions: set[str] = set(required_permissions)

	def __call__(self, user_context: CurrentUser) -> CurrentUserContext:
		if self._required_permissions.issubset(user_context.permissions):
			raise HTTPException(
				status_code=status.HTTP_403_FORBIDDEN,
				detail="You do not have the required permissions to access this resource."
			)

		return user_context
