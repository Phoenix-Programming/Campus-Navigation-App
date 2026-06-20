from datetime import datetime
from sqlalchemy import Result, func, select
from sqlalchemy import delete as sql_delete
from sqlalchemy.exc import IntegrityError
from psycopg.errors import UniqueViolation
from backend.database.db_connection import Database
from backend.exceptions.exceptions import NotUniqueError
from backend.repositories.schema.user import User
from backend.repositories.schema.password_reset_token import PasswordResetToken

class UserRepository:
    async def insert_user(
        self,
        username: str,
        email: str,
        password_hash: str,
        db: Database
    ) -> User:
        new_user: User = User(
            username=username,
            email=email.lower(),
            password_hash=password_hash
        )

        db.add(new_user)

        try:
            await db.commit()
            await db.refresh(new_user)

            return new_user
        except IntegrityError as e:
            await db.rollback()

            if isinstance(e.orig, UniqueViolation):
                detail: str = str(e.orig.diag.message_detail).lower()

                if "username" in detail: raise NotUniqueError("username")
                elif "email" in detail: raise NotUniqueError("email")

            raise
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


    async def update_user(self, user: User, db: Database, username: str | None = None, email: str | None = None) -> User:
        try:
            if username: user.username = username.lower()
            if email: user.email = email.lower()

            return user
        except IntegrityError as e:
            await db.rollback()

            if isinstance(e.orig, UniqueViolation):
                detail: str = str(e.orig.diag.message_detail).lower()

                if "username" in detail: raise NotUniqueError("username")
                elif "email" in detail: raise NotUniqueError("email")

            raise
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


    # TODO: Implement
    async def get_user_permissions(self, username: str, db: Database) -> list[str]:
        return []
