import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt import ExpiredSignatureError, InvalidTokenError, PyJWTError, decode, encode
from pwdlib import PasswordHash
from typing import Annotated, Any, Literal
from backend.settings import settings
from backend.utilities.db_connection import Database
from backend.repositories.user_repository import UserRepository
from backend.schema.user import User
from backend.models.token import RefreshTokenData, RefreshTokenRequest, TokenData
from .current_user_context import CurrentUserContext


pwd_hasher: PasswordHash = PasswordHash.recommended()

oauth2_scheme: OAuth2PasswordBearer = OAuth2PasswordBearer(
    tokenUrl="api/users/login",
    refreshUrl="api/users/refresh"
)

user_repo: UserRepository = UserRepository()


def hash_password(pwd: str) -> str:
    return pwd_hasher.hash(pwd)


def verify_password(plain_pwd: str, hashed_pwd: str) -> bool:
    return pwd_hasher.verify(password=plain_pwd, hash=hashed_pwd)


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_token(
    user_id: int,
    token_type: Literal["access", "refresh"],
    permissions: list[str] | None = None,
    expires_delta: timedelta | None = None
) -> str:
	"""Creates a JWT access token."""
	to_encode: dict[str, str | list[str] | datetime] = {"sub": str(user_id), "type": token_type}
	if permissions:
		to_encode["permissions"] = permissions

	expire: datetime = datetime.now(UTC) + (
		expires_delta
		if expires_delta
		else timedelta(minutes=settings.access_token_expire_minutes)
	)
	to_encode.update({"exp": expire})

	to_encode.update({"jti": secrets.token_urlsafe(32)})

	encoded_jwt = encode(
		to_encode,
		settings.secret_key.get_secret_value(),
		algorithm=settings.algorithm
	)

	return encoded_jwt


def verify_access_token(token: str) -> TokenData | None:
    """Verify a JWT access token and return the subject (user ID) and permissions if valid"""
    try:
        payload: dict[str, Any] = decode(
			token,
			settings.secret_key.get_secret_value(),
			algorithms=[settings.algorithm],
			options={"require": ["exp", "sub"]}
		)

        return TokenData(
            user_id=payload.get("sub"),
            permissions=payload.get("permissions") or set()
        )
    except InvalidTokenError:
        return None


def verify_refresh_token(token: RefreshTokenRequest) -> RefreshTokenData:
	try:
		payload: dict[str, Any] = decode(
			token.token,
			settings.secret_key.get_secret_value(),
			algorithms=[settings.algorithm]
		)

		# Enforce token type validation
		if payload.get("type") != "refresh":
			raise HTTPException(
				status_code=status.HTTP_401_UNAUTHORIZED,
				detail="Invalid token type. Expected a refresh token.",
			)

		user_id: int | None = payload.get("sub")
		assert user_id

		return RefreshTokenData(token=token.token, user_id=user_id)
	except (ExpiredSignatureError, PyJWTError):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or expired refresh token."
		)


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Database
) -> CurrentUserContext:
	token_data: TokenData | None = verify_access_token(token)

	if not token_data or not token_data.user_id or token_data.permissions is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or expired JWT token.",
			headers={"WWW-Authenticate": "Bearer"}
		)

	try:
		user_id_int: int = int(token_data.user_id)
	except (TypeError, ValueError):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid or expired JWT token.",
			headers={"WWW-Authenticate": "Bearer"}
		)

	user: User | None = await user_repo.get_user_by_id(user_id=user_id_int, db=db)

	if not user:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User not found.",
			headers={"WWW-Authenticate": "Bearer"}
		)

	return CurrentUserContext(user, token_data.permissions)


CurrentUser = Annotated[CurrentUserContext, Depends(get_current_user)]
