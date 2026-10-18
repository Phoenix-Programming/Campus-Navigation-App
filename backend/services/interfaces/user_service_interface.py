from abc import ABC, abstractmethod
from fastapi import BackgroundTasks, Depends
from fastapi.security import OAuth2PasswordRequestForm
from typing import Annotated
from backend.auth.current_user_context import CurrentUserContext
from backend.repositories.interfaces.user_repository_interface import UserRepositoryInterface
from backend.models.token import AccessRefreshTokenPair
from backend.models.user import UserRegisterRequest, UserUpdateRequest
from backend.models.password_reset import (
    ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
)
from backend.schema.user import User


class UserServiceInterface(ABC):
    @abstractmethod
    async def register_user(self, user_create_request: UserRegisterRequest) -> User: pass

    @abstractmethod
    async def login_user(
        self,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        remember_me: bool
    ) -> AccessRefreshTokenPair: pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> AccessRefreshTokenPair: pass

    @abstractmethod
    async def forgot_password(
        self,
        request_data: ForgotPasswordRequest,
        background_tasks: BackgroundTasks
    ) -> dict[str, str]: pass

    @abstractmethod
    async def reset_password(self, request_data: ResetPasswordRequest) -> dict[str, str]: pass

    @abstractmethod
    async def change_password(
        self,
        password_data: ChangePasswordRequest,
        current_user: CurrentUserContext
    ) -> dict[str, str]: pass

    @abstractmethod
    async def get_user(self, user_id: int) -> User: pass

    @abstractmethod
    async def update_user(
        self,
        user_id: int,
        user_update: UserUpdateRequest,
        current_user: CurrentUserContext
    ) -> User: pass

    @abstractmethod
    async def delete_user(
        self,
        user_id: int,
        current_user: CurrentUserContext
    ) -> None: pass
