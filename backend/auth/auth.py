import hashlib
import jwt
import secrets
from datetime import UTC, datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pwdlib import PasswordHash
from typing import Annotated
from backend.config.settings import settings
from backend.database.db_connection import Database
from backend.repositories.user_repository import UserRepository
from backend.repositories.schema.user import User
from backend.services.models.user import TokenData
from .current_user_context import CurrentUserContext


pwd_hasher: PasswordHash = PasswordHash.recommended()

oauth2_scheme: OAuth2PasswordBearer = OAuth2PasswordBearer(tokenUrl="api/users/token")

user_repo: UserRepository = UserRepository()


def hash_password(pwd: str) -> str:
    return pwd_hasher.hash(pwd)


def verify_password(plain_pwd: str, hashed_pwd: str) -> bool:
    return pwd_hasher.verify(password=plain_pwd, hash=hashed_pwd)


def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)


def hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
	"""Creates a JWT access token."""
	to_encode: dict = data.copy()

	expire: datetime = datetime.now(UTC) + (
		expires_delta
  		if expires_delta
  		else timedelta(minutes=settings.access_token_expire_minutes)
	)

	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(
		to_encode,
		settings.secret_key.get_secret_value(),
		algorithm=settings.algorithm
	)

	return encoded_jwt


def verify_access_token(token: str) -> TokenData | None:
    """Verify a JWT access token and return the subject (user ID) if valid"""
    try:
        payload = jwt.decode(
			token,
			settings.secret_key.get_secret_value(),
			algorithms=[settings.algorithm],
			options={"require": ["exp", "sub"]}
		)
    except jwt.InvalidTokenError:
        return None
    else:
        return TokenData(user_id=payload.get("sub"), permissions=payload.get("permissions"))


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
