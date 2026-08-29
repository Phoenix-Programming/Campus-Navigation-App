from datetime import datetime
from sqlalchemy import Result, func, select
from sqlalchemy import delete as sql_delete
from backend.utilities.db_connection import Database
from backend.exceptions import UserNotFoundError
from backend.schema.active_refresh_token import ActiveRefreshToken
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.permissions import Permission, Role
from backend.schema.user import User


class UserRepository:
    async def insert_user(
        self,
        username: str,
        email: str,
        password_hash: str,
        role_name: str,
        db: Database
    ) -> User:
        result: Result[tuple[Role]] = await db.execute(select(Role).where(Role.name == role_name))
        role: Role | None = result.scalars().first()
        assert role

        new_user: User = User(
            username=username,
            email=email.lower(),
            password_hash=password_hash,
            role_id=role.id
        )

        db.add(new_user)

        try:
            await db.commit()
            await db.refresh(new_user)

            return new_user
        except:
            await db.rollback()
            raise


    async def get_user_by_id(self, user_id: int, db: Database) -> User | None:
        result: Result[tuple[User]] = await db.execute(select(User).where(User.id == user_id))

        return result.scalars().first()


    async def get_user_by_email(self, email: str, db: Database) -> User | None:
        result: Result[tuple[User]] = await db.execute(
            select(User).where(func.lower(User.email) == email.lower())
        )

        return result.scalars().first()


    async def get_user_by_username(self, username: str, db: Database) -> User | None:
        result: Result[tuple[User]] = await db.execute(
            select(User).where(func.lower(User.username) == username.lower())
        )

        return result.scalars().first()


    async def update_user(self, user: User, db: Database, username: str | None = None, email: str | None = None) -> User:
        try:
            if username: user.username = username.lower()
            if email: user.email = email.lower()

            return user
        except:
            await db.rollback()
            raise


    async def update_user_password_hash(self, user: User, password_hash: str, db: Database) -> User:
        try:
            user.password_hash = password_hash

            return user
        except:
            await db.rollback()
            raise


    async def delete_user(self, user: User, db: Database) -> None:
        try:
            await db.delete(user)
            await db.commit()
        except:
            await db.rollback()
            raise


    async def get_matching_refresh_token(
        self,
        token_hash: str,
        db: Database
    ) -> ActiveRefreshToken | None:
        result: Result[tuple[ActiveRefreshToken]] = await db.execute(
            select(ActiveRefreshToken).where(ActiveRefreshToken.token_hash == token_hash)
        )

        return result.scalars().first()


    async def insert_refresh_token(
        self,
        user_id: int,
        token_hash: str,
        is_long_lived: bool,
        expires_at: datetime,
        db: Database
    ) -> None:
        try:
            active_refresh_token: ActiveRefreshToken = ActiveRefreshToken(
                user_id=user_id,
                token_hash=token_hash,
                is_long_lived=is_long_lived,
                expires_at=expires_at
            )

            db.add(active_refresh_token)
            await db.commit()
        except:
            await db.rollback()
            raise


    async def revoke_all_refresh_tokens_for_user(self, user_id: int, db: Database) -> None:
        result: Result[tuple[ActiveRefreshToken]] = await db.execute(
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
        expires_at: datetime,
        db: Database
    ) -> None:
        try:
            reset_token: PasswordResetToken = PasswordResetToken(
                user_id=user_id,
                token_hash=token_hash,
                expires_at=expires_at
            )

            db.add(reset_token)
            await db.commit()
        except:
            await db.rollback()
            raise


    async def get_password_reset_token_by_token_hash(
        self,
        token_hash: str,
        db: Database
    ) -> PasswordResetToken | None:
        result: Result[tuple[PasswordResetToken]] = await db.execute(
            select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
        )

        return result.scalars().first()


    async def get_password_reset_token_owner(
        self,
        token: PasswordResetToken,
        db: Database
    ) -> User | None:
        result: Result[tuple[User]] = await db.execute(
			select(User).where(User.id == token.user_id)
		)

        return result.scalars().first()


    async def delete_password_reset_token(self, token: PasswordResetToken, db: Database) -> None:
        try:
            await db.delete(token)
            await db.commit()
        except:
            await db.rollback()
            raise


    async def delete_all_password_reset_tokens_for_user(self, user: User, db: Database) -> None:
        try:
            await db.execute(
                sql_delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id)
            )

            await db.commit()
        except:
            await db.rollback()
            raise


    async def get_user_permissions(self, user_id: int, db: Database) -> list[Permission]:
        user_result: Result[tuple[User]] = await db.execute(select(User).where(User.id == user_id))
        user: User | None = user_result.scalars().first()

        if not user: raise UserNotFoundError()

        permission_result: Result[tuple[Permission]] = await db.execute(
            select(Permission).join(Role.permissions).where(Role.id == user.role_id)
        )

        return list(permission_result.scalars().all())
