from datetime import UTC, datetime, timedelta
from fastapi import BackgroundTasks, Depends
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from backend.exceptions import *
from backend.auth.auth import (
    create_access_token,
    generate_reset_token,
    hash_password,
    hash_reset_token,
    verify_password
)
from backend.auth.current_user_context import CurrentUserContext
from backend.settings import settings
from backend.models.token import Token
from backend.models.user import UserCreateRequest, UserUpdateRequest
from backend.models.password_reset import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest
)
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.user import User
from backend.utilities.db_connection import Database
from backend.utilities.email import send_password_reset_email
from backend.repositories.user_repository import UserRepository


class UserService:
	def __init__(self) -> None:
		self.repo: UserRepository = UserRepository()


	async def register_user(self, user: UserCreateRequest, db: Database) -> User:
		return await self.repo.insert_user(
      		username=user.username,
        	email=user.email.lower(),
         	password_hash=hash_password(user.password),
			db=db
        )


	async def login_user(
		self,
		form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
		db: Database
	) -> Token:
		# quirk of OAuth2 is that the email is in the username field
		user: User | None = await self.repo.get_user_by_email(email=form_data.username, db=db)

		# verify the user exists and the password is correct, but don't reveal which one failed
		if not user or not verify_password(form_data.password, user.password_hash):
			raise IncorrectEmailOrPasswordError()

		# create the access token with the user id as the subject
		access_token_expires: timedelta = timedelta(minutes=settings.access_token_expire_minutes)
		access_token: str = create_access_token(
			data={
				"sub": str(user.id),
				"permissions": await self.repo.get_user_permissions(username=user.username, db=db)
			},
			expires_delta=access_token_expires
		)
		return Token(access_token=access_token, token_type="bearer")


	async def forgot_password(
		self,
		request_data: ForgotPasswordRequest,
		background_tasks: BackgroundTasks,
		db: Database
	) -> dict[str, str]:
		user: User | None = await self.repo.get_user_by_email(email=request_data.email, db=db)

		if user:
			await self.repo.delete_all_password_reset_tokens_for_user(user=user, db=db)

			token: str = generate_reset_token()
			token_hash: str = hash_reset_token(token)
			expires_at: datetime = datetime.now(UTC) + timedelta(
				minutes=settings.reset_token_expire_minutes
			)

			await self.repo.insert_password_reset_token(
				user_id=user.id,
				token_hash=token_hash,
				expires_at=expires_at,
				db=db
			)

			background_tasks.add_task(
				send_password_reset_email,
				to_email=user.email,
				username=user.username,
				token=token
			)

		return {
			"message": "If an account exists with this email, you will recieve an email with password reset instructions."
		}


	async def reset_password(
		self,
		request_data: ResetPasswordRequest,
		db: Database
	) -> dict[str, str]:
		token_hash: str = hash_reset_token(request_data.token)

		reset_token: PasswordResetToken | None = (
			await self.repo.get_password_reset_token_by_token_hash(token_hash=token_hash, db=db)
		)

		if not reset_token: raise InvalidOrExpiredPasswordResetTokenError()

		if reset_token.expires_at < datetime.now(UTC):
			await self.repo.delete_password_reset_token(token=reset_token, db=db)

			raise InvalidOrExpiredPasswordResetTokenError()

		user: User | None = await self.repo.get_password_reset_token_owner(token=reset_token, db=db)

		if not user:
			raise InvalidOrExpiredPasswordResetTokenError()

		await self.repo.update_user_password_hash(
      		user=user,
        	password_hash=hash_password(request_data.new_password),
			db=db
        )

		await self.repo.delete_all_password_reset_tokens_for_user(user=user, db=db)

		return {
			"message": "Password reset successfully. You can now log in with your new password."
		}


	async def change_password(
		self,
		password_data: ChangePasswordRequest,
		current_user: CurrentUserContext,
		db: Database
	) -> dict[str, str]:
		if not verify_password(password_data.current_password, current_user.user.password_hash):
			raise IncorrectCurrentPasswordError()

		await self.repo.update_user_password_hash(
      		user=current_user.user,
        	password_hash=hash_password(password_data.new_password),
			db=db
        )

		await self.repo.delete_all_password_reset_tokens_for_user(user=current_user.user, db=db)

		return {"message": "Password changed successfully."}


	async def get_user(self, user_id: int, db: Database) -> User:
		user: User | None = await self.repo.get_user_by_id(user_id=user_id, db=db)

		if not user: raise UserNotFoundError()

		return user


	async def update_user(
		self,
		user_id: int,
		user_update: UserUpdateRequest,
		current_user: CurrentUserContext,
		db: Database
	) -> User:
		if user_id != current_user.user.id: raise NotAuthorizedToUpdateUserError()

		user: User | None = await self.repo.get_user_by_id(user_id=user_id, db=db)

		if not user: raise UserNotFoundError()

		return await self.repo.update_user(
      		user=current_user.user,
        	**user_update.model_dump(exclude_unset=True),
         	db=db
        )


	async def delete_user(
		self,
		user_id: int,
		current_user: CurrentUserContext,
		db: Database
	) -> None:
		if user_id != current_user.user.id: raise NotAuthorizedToDeleteUserError()

		user: User | None = await self.repo.get_user_by_id(user_id=user_id, db=db)

		if not user: raise UserNotFoundError()

		await self.repo.delete_user(user=user, db=db)
