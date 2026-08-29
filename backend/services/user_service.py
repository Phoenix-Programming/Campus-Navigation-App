from datetime import UTC, datetime, timedelta
from fastapi import BackgroundTasks, Depends
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from backend.exceptions import (
    IncorrectCurrentPasswordError, IncorrectUsernameOrPasswordError,
    InvalidOrExpiredPasswordResetTokenError, InvalidOrExpiredRefreshToken,
    NotAuthorizedToDeleteUserError, NotAuthorizedToUpdateUserError, NotUniqueError,
    SamePasswordError, UserNotFoundError
)
from backend.auth.auth import (
    create_token, generate_reset_token, hash_password, hash_token, verify_password
)
from backend.auth.current_user_context import CurrentUserContext
from backend.settings import settings
from backend.models.token import AccessRefreshTokenPair
from backend.models.user import UserRegisterRequest, UserUpdateRequest
from backend.models.password_reset import (
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from backend.schema.active_refresh_token import ActiveRefreshToken
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.permissions import Permission
from backend.schema.user import User
from backend.utilities.db_connection import Database
from backend.utilities.email import send_password_reset_email
from backend.repositories.user_repository import UserRepository


class UserService:
	def __init__(self) -> None:
		self.repo: UserRepository = UserRepository()


	async def register_user(self, user_create_request: UserRegisterRequest, db: Database) -> User:
		result: User | None = await self.repo.get_user_by_username(
			username=user_create_request.username,
			db=db
		)

		if result: raise NotUniqueError("username")

		result = await self.repo.get_user_by_email(
			email=user_create_request.email,
			db=db
		)

		if result: raise NotUniqueError("email")

		return await self.repo.insert_user(
			username=user_create_request.username,
			email=user_create_request.email.lower(),
			password_hash=hash_password(user_create_request.password),
			role_name="user",
			db=db
		)


	async def login_user(
		self,
		form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
		remember_me: bool,
		db: Database
	) -> AccessRefreshTokenPair:
		# get the user by either their username or email, depending on which they provided
		usernameOrEmail: str = form_data.username
		user: User | None = (
      		await self.repo.get_user_by_email(email=usernameOrEmail, db=db)
			if '@' in usernameOrEmail
			else await self.repo.get_user_by_username(username=usernameOrEmail, db=db)
		)

		# verify the user exists and the password is correct, but don't reveal which one failed
		if not user or not verify_password(form_data.password, user.password_hash):
			raise IncorrectUsernameOrPasswordError()

		# create the access and refresh tokens
		access_token: str = await self._create_access_token(user_id=user.id, db=db)
		refresh_token: str = await self._create_refresh_token(user.id)

		# store the refresh token in the database
		expire_minutes: int = (
      		settings.long_lived_refresh_token_expire_minutes
			if remember_me
			else settings.standard_refresh_token_expire_minutes
		)
		await self.repo.insert_refresh_token(
			user_id=user.id,
			token_hash=hash_token(refresh_token),
			is_long_lived=remember_me,
			expires_at=datetime.now(UTC) + timedelta(minutes=expire_minutes),
			db=db
		)

		return AccessRefreshTokenPair(
      		access_token=access_token,
        	refresh_token=refresh_token,
         	token_type="bearer"
        )


	async def refresh_token(
    	self,
      	refresh_token: str,
       	db: Database
    ) -> AccessRefreshTokenPair:
		refresh_token_hash: str = hash_token(refresh_token)

		# check that the refresh token is valid
		active_refresh_token: ActiveRefreshToken | None = (
      		await self.repo.get_matching_refresh_token(
				token_hash=refresh_token_hash,
				db=db
			)
		)

		if not active_refresh_token: raise InvalidOrExpiredRefreshToken()

		# check that the refresh token hasn't been revoked, if it has, then this is a stolen
		# refresh token and all the other refresh tokens for this user should be revoked
		if active_refresh_token.is_revoked:
			await self.repo.revoke_all_refresh_tokens_for_user(
       			user_id=active_refresh_token.user_id,
          		db=db
        	)
			raise InvalidOrExpiredRefreshToken()

		# check if the refresh token has expired
		if active_refresh_token.expires_at < datetime.now(UTC):
			active_refresh_token.is_revoked = True
			raise InvalidOrExpiredRefreshToken()

		# check that the refresh token hasn't exceeded the sliding refresh window
		time_since_last_used: timedelta = datetime.now(UTC) - active_refresh_token.last_used_at

		if time_since_last_used > timedelta(days=settings.sliding_refresh_window_days):
			raise InvalidOrExpiredRefreshToken()

		# rotate the refresh token
		active_refresh_token.is_revoked = True
		new_refresh_token: str = await self._create_refresh_token(active_refresh_token.user_id)
		await self.repo.insert_refresh_token(
			user_id=active_refresh_token.user_id,
        	token_hash=hash_token(new_refresh_token),
			is_long_lived=active_refresh_token.is_long_lived,
         	expires_at=active_refresh_token.expires_at,
          	db=db
        )

		# create a new access token
		new_access_token: str = await self._create_access_token(user_id=active_refresh_token.user_id, db=db)

		return AccessRefreshTokenPair(
      		access_token=new_access_token,
        	refresh_token=new_refresh_token,
			token_type="bearer"
        )


	async def forgot_password(
		self,
		request_data: ForgotPasswordRequest,
		background_tasks: BackgroundTasks,
		db: Database
	) -> dict[str, str]:
		user: User | None = await self.repo.get_user_by_email(email=request_data.email, db=db)

		if user:
			await self.repo.delete_all_password_reset_tokens_for_user(user=user, db=db)
			await self.repo.revoke_all_refresh_tokens_for_user(user_id=user.id, db=db)

			token: str = generate_reset_token()
			token_hash: str = hash_token(token)
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
		token_hash: str = hash_token(request_data.token)

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
		await self.repo.revoke_all_refresh_tokens_for_user(user_id=user.id, db=db)

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

		if password_data.current_password == password_data.new_password: raise SamePasswordError()

		await self.repo.update_user_password_hash(
      		user=current_user.user,
        	password_hash=hash_password(password_data.new_password),
			db=db
        )

		await self.repo.delete_all_password_reset_tokens_for_user(user=current_user.user, db=db)
		await self.repo.revoke_all_refresh_tokens_for_user(user_id=current_user.user.id, db=db)

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

		result: User | None

		if user_update.username and user_update.username.lower() != user.username.lower():
			result = await self.repo.get_user_by_username(
				username=user_update.username,
				db=db
			)

			if result: raise NotUniqueError("username")

		if user_update.email and user_update.email.lower() != user.email.lower():
			result = await self.repo.get_user_by_email(
				email=user_update.email,
				db=db
			)

			if result: raise NotUniqueError("email")

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


	async def _create_access_token(self, user_id: int, db: Database) -> str:
		# create the access token with the user id as the subject
		access_token_expires: timedelta = timedelta(minutes=settings.access_token_expire_minutes)
		permissions: list[Permission] = await self.repo.get_user_permissions(
      		user_id=user_id,
        	db=db
        )
		access_token: str = create_token(
			user_id,
			permissions=[p.name for p in permissions],
			expires_delta=access_token_expires,
			token_type="access"
		)
		return access_token


	async def _create_refresh_token(self, user_id: int) -> str:
		# create the refresh token with the user id as the subject
		refresh_token_expires: timedelta = timedelta(minutes=settings.standard_refresh_token_expire_minutes)
		refresh_token: str = create_token(
			user_id,
			expires_delta=refresh_token_expires,
			token_type="refresh"
		)
		return refresh_token
