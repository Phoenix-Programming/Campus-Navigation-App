from abc import ABC, abstractmethod
from datetime import datetime
from backend.schema.active_refresh_token import ActiveRefreshToken
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.permissions import Permission
from backend.schema.user import User


class UserRepositoryInterface(ABC):
    @abstractmethod
    async def insert_user(
        self,
        username: str,
        email: str,
        password_hash: str,
        role_name: str
    ) -> User: pass

    @abstractmethod
    async def get_user_by_id(self, user_id: int) -> User | None: pass

    @abstractmethod
    async def get_user_by_email(self, email: str) -> User | None: pass

    @abstractmethod
    async def get_user_by_username(self, username: str) -> User | None: pass

    @abstractmethod
    async def get_user_role_name(self, user_id: int) -> str | None: pass

    @abstractmethod
    async def update_user(self, user: User, username: str | None = None, email: str | None = None) -> User: pass

    @abstractmethod
    async def update_user_password_hash(self, user: User, password_hash: str) -> User: pass

    @abstractmethod
    async def delete_user(self, user: User) -> None: pass

    @abstractmethod
    async def get_matching_refresh_token(self, token_hash: str) -> ActiveRefreshToken | None: pass

    @abstractmethod
    async def insert_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        is_long_lived: bool,
        expires_at: datetime
    ) -> None: pass

    @abstractmethod
    async def revoke_all_refresh_tokens_for_user(self, user_id: int) -> None: pass

    @abstractmethod
    async def insert_password_reset_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime
    ) -> None: pass

    @abstractmethod
    async def get_password_reset_token_by_token_hash(self, token_hash: str) -> PasswordResetToken | None: pass

    @abstractmethod
    async def get_password_reset_token_owner(self, token: PasswordResetToken) -> User | None: pass

    @abstractmethod
    async def delete_password_reset_token(self, token: PasswordResetToken) -> None: pass

    @abstractmethod
    async def delete_all_password_reset_tokens_for_user(self, user: User) -> None: pass

    @abstractmethod
    async def get_user_permissions(self, user_id: int) -> list[Permission]: pass
