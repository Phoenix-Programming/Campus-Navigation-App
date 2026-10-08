from datetime import timedelta
from types import SimpleNamespace
from typing import Any, cast
from pydantic import SecretStr

import pytest
from fastapi import HTTPException, status

from backend.auth import auth as auth_module
from backend.models.token import RefreshTokenRequest, TokenData


def _fake_db() -> Any:
    return cast(Any, object())


def test_hash_password_and_verify_password_roundtrip() -> None:
    plain = "TestPassword123!"
    hashed = auth_module.hash_password(plain)

    assert hashed != plain
    assert auth_module.verify_password(plain, hashed) is True
    assert auth_module.verify_password("WrongPassword123!", hashed) is False


def test_generate_reset_token_and_hash_token() -> None:
    token = auth_module.generate_reset_token()

    assert isinstance(token, str)
    assert len(token) > 20
    assert auth_module.hash_token("abc") == auth_module.hash_token("abc")
    assert auth_module.hash_token("abc") != auth_module.hash_token("def")


def test_hash_token_depends_on_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_module.settings, "secret_key", SecretStr("secret-one"))
    hash_one = auth_module.hash_token("same-token")

    monkeypatch.setattr(auth_module.settings, "secret_key", SecretStr("secret-two"))
    hash_two = auth_module.hash_token("same-token")

    assert hash_one != hash_two


def test_create_and_verify_access_token_with_optional_claims() -> None:
    token = auth_module.create_token(
        user_id=5,
        token_type="access",
        permissions=["perm.read"],
        role="admin",
        expires_delta=timedelta(minutes=2),
    )

    token_data = auth_module.verify_access_token(token)

    assert token_data is not None
    assert token_data.user_id == "5"
    assert token_data.permissions == {"perm.read"}
    assert token_data.role == "admin"


def test_create_and_verify_access_token_without_optional_claims() -> None:
    token = auth_module.create_token(user_id=7, token_type="access")
    token_data = auth_module.verify_access_token(token)

    assert token_data is not None
    assert token_data.user_id == "7"
    assert token_data.permissions == set()
    assert token_data.role is None


def test_verify_access_token_invalid_returns_none() -> None:
    assert auth_module.verify_access_token("definitely-not-a-jwt") is None


def test_verify_refresh_token_success() -> None:
    token = auth_module.create_token(
        user_id=10,
        token_type="refresh",
        expires_delta=timedelta(minutes=5),
    )

    result = auth_module.verify_refresh_token(RefreshTokenRequest(token=token))

    assert result.user_id == 10
    assert result.token == token


def test_verify_refresh_token_wrong_type_raises_401() -> None:
    access_token = auth_module.create_token(
        user_id=10,
        token_type="access",
        expires_delta=timedelta(minutes=5),
    )

    with pytest.raises(HTTPException) as exc_info:
        auth_module.verify_refresh_token(RefreshTokenRequest(token=access_token))

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Invalid token type. Expected a refresh token."


def test_verify_refresh_token_invalid_raises_401() -> None:
    with pytest.raises(HTTPException) as exc_info:
        auth_module.verify_refresh_token(RefreshTokenRequest(token="bad-token"))

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Invalid or expired refresh token."


@pytest.mark.anyio
async def test_get_current_user_success_uses_role_from_token(monkeypatch: pytest.MonkeyPatch) -> None:
    user = SimpleNamespace(id=3, username="u", email="u@example.com")

    monkeypatch.setattr(
        auth_module,
        "verify_access_token",
        lambda _token: TokenData(user_id="3", permissions={"p.read"}, role="admin"),
    )

    async def fake_get_user_by_id(user_id: int, db) -> object:
        assert user_id == 3
        return user

    async def fake_get_role_name(user_id: int, db) -> str:
        raise AssertionError("Role lookup should not run when role claim exists")

    monkeypatch.setattr(auth_module.user_repo, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(auth_module.user_repo, "get_user_role_name", fake_get_role_name)

    context = await auth_module.get_current_user(token="token", db=_fake_db())

    assert context.user is user
    assert context.permissions == {"p.read"}
    assert context.role == "admin"


@pytest.mark.anyio
async def test_get_current_user_success_fetches_role_when_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    user = SimpleNamespace(id=3, username="u", email="u@example.com")

    monkeypatch.setattr(
        auth_module,
        "verify_access_token",
        lambda _token: TokenData(user_id="3", permissions={"p.read"}, role=None),
    )

    async def fake_get_user_by_id(user_id: int, db) -> object:
        return user

    async def fake_get_role_name(user_id: int, db) -> str:
        assert user_id == 3
        return "editor"

    monkeypatch.setattr(auth_module.user_repo, "get_user_by_id", fake_get_user_by_id)
    monkeypatch.setattr(auth_module.user_repo, "get_user_role_name", fake_get_role_name)

    context = await auth_module.get_current_user(token="token", db=_fake_db())

    assert context.role == "editor"


@pytest.mark.anyio
async def test_get_current_user_invalid_token_raises_401(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_module, "verify_access_token", lambda _token: None)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.get_current_user(token="token", db=_fake_db())

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Invalid or expired JWT token."


@pytest.mark.anyio
async def test_get_current_user_invalid_user_id_raises_401(monkeypatch: pytest.MonkeyPatch) -> None:
    token_data = TokenData(user_id="not-an-int", permissions={"perm"}, role="admin")
    monkeypatch.setattr(auth_module, "verify_access_token", lambda _token: token_data)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.get_current_user(token="token", db=_fake_db())

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "Invalid or expired JWT token."


@pytest.mark.anyio
async def test_get_current_user_missing_user_raises_401(monkeypatch: pytest.MonkeyPatch) -> None:
    token_data = TokenData(user_id="44", permissions={"perm"}, role="user")
    monkeypatch.setattr(auth_module, "verify_access_token", lambda _token: token_data)

    async def fake_get_user_by_id(user_id: int, db) -> None:
        return None

    monkeypatch.setattr(auth_module.user_repo, "get_user_by_id", fake_get_user_by_id)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.get_current_user(token="token", db=_fake_db())

    assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc_info.value.detail == "User not found."


@pytest.mark.anyio
async def test_get_admin_user_forbidden_for_non_admin(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_current_user(token: str, db) -> object:
        return SimpleNamespace(role="user")

    monkeypatch.setattr(auth_module, "get_current_user", fake_get_current_user)

    with pytest.raises(HTTPException) as exc_info:
        await auth_module.get_admin_user(token="token", db=_fake_db())

    assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN
    assert exc_info.value.detail == "User not an admin."


@pytest.mark.anyio
async def test_get_admin_user_success(monkeypatch: pytest.MonkeyPatch) -> None:
    context = SimpleNamespace(role="admin")

    async def fake_get_current_user(token: str, db) -> object:
        return context

    monkeypatch.setattr(auth_module, "get_current_user", fake_get_current_user)

    result = await auth_module.get_admin_user(token="token", db=_fake_db())
    assert result is context
