from datetime import datetime
from sqlalchemy import Result, func, select
from sqlalchemy import delete as sql_delete
from backend.utilities.db_connection import Database
from backend.exceptions import UserNotFoundError
from backend.schema.active_refresh_token import ActiveRefreshToken
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.permissions import Permission, Role
from backend.schema.user import User
from .interfaces.user_repository_interface import UserRepositoryInterface


class UserRepository(UserRepositoryInterface):
    def __init__(self, db: Database):
        self.db = db

    async def insert_user(
        self,
        username: str,
        email: str,
        password_hash: str,
        role_name: str
    ) -> User:
        result: Result[Role] = await self.db.execute(select(Role).where(Role.name == role_name))
        role: Role | None = result.scalars().first()
        assert role

        new_user: User = User(
            username=username,
            email=email.lower(),
            password_hash=password_hash,
            role_id=role.id
        )

        self.db.add(new_user)

        try:
            await self.db.commit()
            await self.db.refresh(new_user)

            return new_user
        except:
            await self.db.rollback()
            raise


    async def get_user_by_id(self, user_id: int) -> User | None:
        result: Result[User] = await self.db.execute(select(User).where(User.id == user_id))

        return result.scalars().first()


    async def get_user_by_email(self, email: str) -> User | None:
        result: Result[User] = await self.db.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )

        return result.scalars().first()


    async def get_user_by_username(self, username: str) -> User | None:
        result: Result[User] = await self.db.execute(
            select(User).where(func.lower(User.username) == username.lower())
        )

        return result.scalars().first()


    async def get_user_role_name(self, user_id: int) -> str | None:
        result: Result[str] = await self.db.execute(
            select(Role.name).join(User.role).where(User.id == user_id)
        )

        return result.scalars().first()


    async def update_user(self, user: User, username: str | None = None, email: str | None = None) -> User:
        try:
            if username: user.username = username.lower()
            if email: user.email = email.lower()

            return user
        except:
            await self.db.rollback()
            raise


    async def update_user_password_hash(self, user: User, password_hash: str) -> User:
        try:
            user.password_hash = password_hash

            return user
        except:
            await self.db.rollback()
            raise


    async def delete_user(self, user: User) -> None:
        try:
            await self.db.delete(user)
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def get_matching_refresh_token(self, token_hash: str) -> ActiveRefreshToken | None:
        result: Result[ActiveRefreshToken] = await self.db.execute(
            select(ActiveRefreshToken).where(ActiveRefreshToken.token_hash == token_hash)
        )

        return result.scalars().first()


    async def insert_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        is_long_lived: bool,
        expires_at: datetime
    ) -> None:
        try:
            active_refresh_token: ActiveRefreshToken = ActiveRefreshToken(
                user_id=user_id,
                token_hash=token_hash,
                is_long_lived=is_long_lived,
                expires_at=expires_at
            )

            self.db.add(active_refresh_token)
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def revoke_all_refresh_tokens_for_user(self, user_id: int) -> None:
        result: Result[ActiveRefreshToken] = await self.db.execute(
            select(ActiveRefreshToken)
            .where(ActiveRefreshToken.user_id == user_id)
            .where(ActiveRefreshToken.is_revoked == False)
        )

        for token in result.scalars().all():
            token.is_revoked = True


    async def insert_password_reset_token(
        self,
        user_id: int,
        token_hash: str,
        expires_at: datetime
    ) -> None:
        try:
            reset_token: PasswordResetToken = PasswordResetToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at
            )

            self.db.add(reset_token)
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def get_password_reset_token_by_token_hash(self, token_hash: str) -> PasswordResetToken | None:
        result: Result[PasswordResetToken] = await self.db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )

        return result.scalars().first()


    async def get_password_reset_token_owner(self, token: PasswordResetToken) -> User | None:
        result: Result[User] = await self.db.execute(
            select(User).where(User.id == token.user_id)
        )

        return result.scalars().first()


    async def delete_password_reset_token(self, token: PasswordResetToken) -> None:
        try:
            await self.db.delete(token)
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def delete_all_password_reset_tokens_for_user(self, user: User) -> None:
        try:
            await self.db.execute(
                sql_delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
            )

            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def get_user_permissions(self, user_id: int) -> list[Permission]:
        user_result: Result[User] = await self.db.execute(select(User).where(User.id == user_id))
        user: User | None = user_result.scalars().first()

        if not user: raise UserNotFoundError()

        permission_result: Result[Permission] = await self.db.execute(
            select(Permission).join(Role.permissions).where(Role.id == user.role_id)
        )

        return list(permission_result.scalars().all())
