class NotFoundError(Exception):
    def __init__(self, msg: str = "Resource not found."):
        super().__init__(msg)


class NotAuthorizedError(Exception):
    def __init__(self, msg: str = "Not authorized."):
        super().__init__(msg)


class NotUniqueError(Exception):
    def __init__(self, field: str):
        self.field: str = field

        super().__init__(f"{field.capitalize()} already exists.")


class IncorrectUsernameOrPasswordError(Exception):
    def __init__(self):
        super().__init__("Incorrect username/email or password.")


class InvalidOrExpiredRefreshToken(Exception):
    def __init__(self):
        super().__init__("Invalid or expired refresh token.")


class InvalidOrExpiredPasswordResetTokenError(Exception):
    def __init__(self):
        super().__init__("Invalid or expired password reset token.")


class IncorrectCurrentPasswordError(Exception):
    def __init__(self):
        super().__init__("Current password is incorrect.")


class SamePasswordError(Exception):
    def __init__(self):
        super().__init__("The new password cannot be the same as the current password.")


class UserNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__(msg="User not found.")


class NotAuthorizedToUpdateUserError(NotAuthorizedError):
    def __init__(self):
        super().__init__(msg="Not authorized to update this user.")


class NotAuthorizedToDeleteUserError(NotAuthorizedError):
    def __init__(self):
        super().__init__(msg="Not authorized to delete this user.")

class NotAuthorizedToEditIndoorMapError(NotAuthorizedError):
    def __init__(self):
        super().__init__(msg="Not authorized to edit indoor map.")

class BuildingCodeNotFoundError(NotFoundError):
    def __init__(self):
        super().__init__(msg="Building code not found.")

class FloorNumberNotFoundError(NotFoundError):
    def __init__(self, bld_id: int):
        super().__init__(msg=f"Floor number not found for building id: {bld_id}.")

class BuildingCategoryNotFoundError(NotFoundError):
    def __init__(self, category_type: str):
        super().__init__(msg=f"Building category '{category_type}' not found.")
