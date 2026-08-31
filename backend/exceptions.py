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


class UserNotFoundError(Exception):
    def __init__(self):
        super().__init__("User not found.")


class NotAuthorizedToUpdateUserError(Exception):
    def __init__(self):
        super().__init__("Not authorized to update this user.")


class NotAuthorizedToDeleteUserError(Exception):
    def __init__(self):
        super().__init__("Not authorized to delete this user.")
