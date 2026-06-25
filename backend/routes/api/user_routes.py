from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from backend.exceptions import (
    NotAuthorizedToDeleteUserError, NotAuthorizedToUpdateUserError, NotUniqueError,
    IncorrectEmailOrPasswordError, IncorrectCurrentPasswordError,
    InvalidOrExpiredPasswordResetTokenError, InvalidOrExpiredRefreshToken, UserNotFoundError
)
from backend.auth.auth import CurrentUser
from backend.utilities.db_connection import Database
from backend.schema.user import User
from backend.models.token import AccessRefreshTokenPair, RefreshTokenRequest
from backend.models.user import (
    UserCreateRequest, UserUpdateRequest, UserPublicResponse, UserPrivateResponse
)
from backend.models.password_reset import (
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from backend.services.user_service import UserService


router: APIRouter = APIRouter(
	prefix="/users",
	tags=["Users"]
)

service: UserService = UserService()


@router.post(path="/register", response_model=UserPrivateResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user: UserCreateRequest, db: Database) -> User:
	try:
		return await service.register_user(user=user, db=db)
	except NotUniqueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/login", response_model=AccessRefreshTokenPair)
async def login(
	form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
	db: Database,
	remember_me: bool = False
) -> AccessRefreshTokenPair:
	try:
		return await service.login_user(form_data=form_data, remember_me=remember_me, db=db)
	except (IncorrectEmailOrPasswordError, UserNotFoundError) as e:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail=str(e),
			headers={"WWW-Authenticate": "Bearer"}
		)


@router.post("/refresh", response_model=AccessRefreshTokenPair)
async def refresh_token(
    db: Database,
    refresh_token: RefreshTokenRequest
) -> AccessRefreshTokenPair:
	try:
		return await service.refresh_token(
    		refresh_token=refresh_token.token,
      		db=db
    	)
	except (InvalidOrExpiredRefreshToken, UserNotFoundError) as e:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail=str(e),
			headers={"WWW-Authenticate": "Bearer"}
		)


@router.get("/me", response_model=UserPrivateResponse)
async def get_current_user(current_user: CurrentUser) -> User:
	"""Get the currently authenticated user"""
	return current_user.user


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
async def forgot_password(
	request_data: ForgotPasswordRequest,
	background_tasks: BackgroundTasks,
	db: Database
) -> dict[str, str]:
	return await service.forgot_password(
		request_data=request_data,
		background_tasks=background_tasks,
		db=db
	)


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
	request_data: ResetPasswordRequest,
	db: Database
) -> dict[str, str]:
	try:
		return await service.reset_password(request_data=request_data, db=db)
	except InvalidOrExpiredPasswordResetTokenError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch("/me/change-password", status_code=status.HTTP_200_OK)
async def change_password(
	password_data: ChangePasswordRequest,
	current_user: CurrentUser,
	db: Database
) -> dict[str, str]:
    try:
        return await service.change_password(
            password_data=password_data,
            current_user=current_user,
            db=db
        )
    except IncorrectCurrentPasswordError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user(user_id: int, db: Database) -> User:
    try:
        return await service.get_user(user_id=user_id, db=db)
    except UserNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{user_id}", response_model=UserPrivateResponse)
async def update_user(
	user_id: int,
	user_update: UserUpdateRequest,
	current_user: CurrentUser,
	db: Database
) -> User:
	try:
		return await service.update_user(
      		user_id=user_id,
			user_update=user_update,
			current_user=current_user,
			db=db
   		)
	except NotAuthorizedToUpdateUserError as e:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
	except UserNotFoundError as e:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
	except NotUniqueError as e:
		raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    current_user: CurrentUser,
    db: Database
) -> None:
	try:
		await service.delete_user(user_id=user_id, current_user=current_user, db=db)
	except NotAuthorizedToDeleteUserError as e:
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
	except UserNotFoundError as e:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
