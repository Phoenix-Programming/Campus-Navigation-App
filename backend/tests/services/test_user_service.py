from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from fastapi import BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from backend.auth.current_user_context import CurrentUserContext
from backend.exceptions import (
    IncorrectCurrentPasswordError,
    IncorrectUsernameOrPasswordError,
    InvalidOrExpiredPasswordResetTokenError,
    InvalidOrExpiredRefreshToken,
    NotAuthorizedToDeleteUserError,
    NotAuthorizedToUpdateUserError,
    NotUniqueError,
    SamePasswordError,
    UserNotFoundError,
)
from backend.models.password_reset import ChangePasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from backend.models.user import UserRegisterRequest, UserUpdateRequest
from backend.repositories.user_repository import UserRepository
from backend.services import user_service as user_service_module
from backend.services.user_service import UserService


def _fake_db() -> AsyncSession:
    return cast(AsyncSession, object())


def _current_user_context(
    user_id: int = 1,
    username: str = "user",
    email: str = "user@example.com",
    password_hash: str = "stored",
) -> CurrentUserContext:
    return cast(
        CurrentUserContext,
        SimpleNamespace(
            user=SimpleNamespace(
                id=user_id,
                username=username,
                email=email,
                password_hash=password_hash,
            ),
            permissions=set(),
            role="user",
        ),
    )


def _service_with_mock_repo() -> tuple[UserService, SimpleNamespace]:
    repo = SimpleNamespace(
        get_user_by_username=AsyncMock(),
        get_user_by_email=AsyncMock(),
        insert_user=AsyncMock(),
        insert_refresh_token=AsyncMock(),
        get_matching_refresh_token=AsyncMock(),
        revoke_all_refresh_tokens_for_user=AsyncMock(),
        delete_all_password_reset_tokens_for_user=AsyncMock(),
        insert_password_reset_token=AsyncMock(),
        get_password_reset_token_by_token_hash=AsyncMock(),
        delete_password_reset_token=AsyncMock(),
        get_password_reset_token_owner=AsyncMock(),
        update_user_password_hash=AsyncMock(),
        get_user_by_id=AsyncMock(),
        update_user=AsyncMock(),
        delete_user=AsyncMock(),
        get_user_role_name=AsyncMock(),
        get_user_permissions=AsyncMock(),
    )
    service = UserService()
    service.repo = cast(UserRepository, repo)
    return service, repo


@pytest.mark.anyio
async def test_register_user_raises_for_existing_username() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_username.return_value = object()

    with pytest.raises(NotUniqueError):
        await service.register_user(
            user_create_request=UserRegisterRequest(
                username="existing",
                email="new@example.com",
                password="Password123!",
            ),
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_register_user_raises_for_existing_email() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_username.return_value = None
    repo.get_user_by_email.return_value = object()

    with pytest.raises(NotUniqueError):
        await service.register_user(
            user_create_request=UserRegisterRequest(
                username="new",
                email="used@example.com",
                password="Password123!",
            ),
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_register_user_success_hashes_password(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_username.return_value = None
    repo.get_user_by_email.return_value = None
    repo.insert_user.return_value = SimpleNamespace(id=1)

    monkeypatch.setattr(user_service_module, "hash_password", lambda _pwd: "hashed")

    result = await service.register_user(
        user_create_request=UserRegisterRequest(
            username="new",
            email="UPPER@EXAMPLE.COM",
            password="Password123!",
        ),
        db=_fake_db(),
    )

    assert result.id == 1
    repo.insert_user.assert_awaited_once()
    kwargs = repo.insert_user.await_args.kwargs
    assert kwargs["email"] == "upper@example.com"
    assert kwargs["password_hash"] == "hashed"


@pytest.mark.anyio
async def test_login_user_raises_on_bad_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_username.return_value = None
    monkeypatch.setattr(user_service_module, "verify_password", lambda _plain, _hash: False)

    with pytest.raises(IncorrectUsernameOrPasswordError):
        await service.login_user(
            form_data=OAuth2PasswordRequestForm(username="u", password="x"),
            remember_me=False,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_login_user_success_uses_email_path(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    user = SimpleNamespace(id=33, password_hash="stored-hash")
    repo.get_user_by_email.return_value = user

    monkeypatch.setattr(user_service_module, "verify_password", lambda _plain, _hash: True)
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hashed-{token}")
    monkeypatch.setattr(service, "_create_access_token", AsyncMock(return_value="access"))
    monkeypatch.setattr(service, "_create_refresh_token", AsyncMock(return_value="refresh"))

    result = await service.login_user(
        form_data=OAuth2PasswordRequestForm(username="u@example.com", password="pw"),
        remember_me=True,
        db=_fake_db(),
    )

    assert result.access_token == "access"
    assert result.refresh_token == "refresh"
    repo.insert_refresh_token.assert_awaited_once()
    assert repo.insert_refresh_token.await_args.kwargs["is_long_lived"] is True


@pytest.mark.anyio
async def test_refresh_token_raises_when_missing() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_matching_refresh_token.return_value = None

    with pytest.raises(InvalidOrExpiredRefreshToken):
        await service.refresh_token("token", db=_fake_db())


@pytest.mark.anyio
async def test_refresh_token_raises_and_revokes_all_when_token_already_revoked(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")
    db = _fake_db()

    repo.get_matching_refresh_token.return_value = SimpleNamespace(
        user_id=9,
        is_revoked=True,
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
        last_used_at=datetime.now(UTC),
        is_long_lived=False,
    )

    with pytest.raises(InvalidOrExpiredRefreshToken):
        await service.refresh_token("token", db=db)

    repo.revoke_all_refresh_tokens_for_user.assert_awaited_once_with(user_id=9, db=db)


@pytest.mark.anyio
async def test_refresh_token_raises_when_expired(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    refresh_row = SimpleNamespace(
        user_id=9,
        is_revoked=False,
        expires_at=datetime.now(UTC) - timedelta(seconds=1),
        last_used_at=datetime.now(UTC),
        is_long_lived=False,
    )
    repo.get_matching_refresh_token.return_value = refresh_row

    with pytest.raises(InvalidOrExpiredRefreshToken):
        await service.refresh_token("token", db=_fake_db())

    assert refresh_row.is_revoked is True


@pytest.mark.anyio
async def test_refresh_token_raises_when_outside_sliding_window(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    repo.get_matching_refresh_token.return_value = SimpleNamespace(
        user_id=9,
        is_revoked=False,
        expires_at=datetime.now(UTC) + timedelta(minutes=10),
        last_used_at=datetime.now(UTC) - timedelta(days=999),
        is_long_lived=False,
    )

    with pytest.raises(InvalidOrExpiredRefreshToken):
        await service.refresh_token("token", db=_fake_db())


@pytest.mark.anyio
async def test_refresh_token_success_rotates(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    refresh_row = SimpleNamespace(
        user_id=9,
        is_revoked=False,
        expires_at=datetime.now(UTC) + timedelta(minutes=20),
        last_used_at=datetime.now(UTC),
        is_long_lived=True,
    )
    repo.get_matching_refresh_token.return_value = refresh_row
    monkeypatch.setattr(service, "_create_refresh_token", AsyncMock(return_value="new-refresh"))
    monkeypatch.setattr(service, "_create_access_token", AsyncMock(return_value="new-access"))

    result = await service.refresh_token("token", db=_fake_db())

    assert result.access_token == "new-access"
    assert result.refresh_token == "new-refresh"
    assert refresh_row.is_revoked is True


@pytest.mark.anyio
async def test_forgot_password_without_user_still_returns_generic_message() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_email.return_value = None
    tasks = BackgroundTasks()

    response = await service.forgot_password(
        request_data=ForgotPasswordRequest(email="nobody@example.com"),
        background_tasks=tasks,
        db=_fake_db(),
    )

    assert "account exists" in response["message"]
    assert len(tasks.tasks) == 0


@pytest.mark.anyio
async def test_forgot_password_with_user_creates_token_and_background_task(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    user = SimpleNamespace(id=6, email="u@example.com", username="test")
    repo.get_user_by_email.return_value = user
    tasks = BackgroundTasks()

    monkeypatch.setattr(user_service_module, "generate_reset_token", lambda: "raw-token")
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    response = await service.forgot_password(
        request_data=ForgotPasswordRequest(email="u@example.com"),
        background_tasks=tasks,
        db=_fake_db(),
    )

    assert "account exists" in response["message"]
    repo.insert_password_reset_token.assert_awaited_once()
    assert len(tasks.tasks) == 1


@pytest.mark.anyio
async def test_reset_password_raises_for_missing_token(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    repo.get_password_reset_token_by_token_hash.return_value = None
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    with pytest.raises(InvalidOrExpiredPasswordResetTokenError):
        await service.reset_password(
            request_data=ResetPasswordRequest(token="bad", new_password="NewPassword123!"),
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_reset_password_raises_for_expired_token(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    token_row = SimpleNamespace(expires_at=datetime.now(UTC) - timedelta(seconds=1))
    repo.get_password_reset_token_by_token_hash.return_value = token_row
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    with pytest.raises(InvalidOrExpiredPasswordResetTokenError):
        await service.reset_password(
            request_data=ResetPasswordRequest(token="bad", new_password="NewPassword123!"),
            db=_fake_db(),
        )

    repo.delete_password_reset_token.assert_awaited_once()


@pytest.mark.anyio
async def test_reset_password_raises_when_owner_missing(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    token_row = SimpleNamespace(expires_at=datetime.now(UTC) + timedelta(minutes=5))
    repo.get_password_reset_token_by_token_hash.return_value = token_row
    repo.get_password_reset_token_owner.return_value = None
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")

    with pytest.raises(InvalidOrExpiredPasswordResetTokenError):
        await service.reset_password(
            request_data=ResetPasswordRequest(token="bad", new_password="NewPassword123!"),
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_reset_password_success(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    token_row = SimpleNamespace(expires_at=datetime.now(UTC) + timedelta(minutes=5))
    user = SimpleNamespace(id=4)
    repo.get_password_reset_token_by_token_hash.return_value = token_row
    repo.get_password_reset_token_owner.return_value = user
    monkeypatch.setattr(user_service_module, "hash_token", lambda token: f"hash-{token}")
    monkeypatch.setattr(user_service_module, "hash_password", lambda pwd: f"hashed-{pwd}")

    response = await service.reset_password(
        request_data=ResetPasswordRequest(token="good", new_password="NewPassword123!"),
        db=_fake_db(),
    )

    assert response["message"].startswith("Password reset successfully")
    repo.update_user_password_hash.assert_awaited_once()
    repo.revoke_all_refresh_tokens_for_user.assert_awaited_once()


@pytest.mark.anyio
async def test_change_password_rejects_wrong_current_password(monkeypatch: pytest.MonkeyPatch) -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=1, password_hash="stored")
    monkeypatch.setattr(user_service_module, "verify_password", lambda *_: False)

    with pytest.raises(IncorrectCurrentPasswordError):
        await service.change_password(
            password_data=ChangePasswordRequest(
                current_password="OldPassword123!",
                new_password="NewPassword123!",
            ),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_change_password_rejects_same_password(monkeypatch: pytest.MonkeyPatch) -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=1, password_hash="stored")
    monkeypatch.setattr(user_service_module, "verify_password", lambda *_: True)

    with pytest.raises(SamePasswordError):
        await service.change_password(
            password_data=ChangePasswordRequest(
                current_password="SamePassword123!",
                new_password="SamePassword123!",
            ),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_change_password_success(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=1, password_hash="stored")
    monkeypatch.setattr(user_service_module, "verify_password", lambda *_: True)
    monkeypatch.setattr(user_service_module, "hash_password", lambda pwd: f"hashed-{pwd}")

    response = await service.change_password(
        password_data=ChangePasswordRequest(
            current_password="OldPassword123!",
            new_password="NewPassword123!",
        ),
        current_user=current_user,
        db=_fake_db(),
    )

    assert response == {"message": "Password changed successfully."}
    repo.update_user_password_hash.assert_awaited_once()


@pytest.mark.anyio
async def test_get_user_not_found() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_id.return_value = None

    with pytest.raises(UserNotFoundError):
        await service.get_user(user_id=1, db=_fake_db())


@pytest.mark.anyio
async def test_get_user_success() -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_by_id.return_value = SimpleNamespace(id=7, username="u")

    user = await service.get_user(user_id=7, db=_fake_db())

    assert user.id == 7


@pytest.mark.anyio
async def test_update_user_unauthorized() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2)

    with pytest.raises(NotAuthorizedToUpdateUserError):
        await service.update_user(
            user_id=1,
            user_update=UserUpdateRequest(username="new"),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_user_not_found() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2, username="old", email="old@example.com")
    repo.get_user_by_id.return_value = None

    with pytest.raises(UserNotFoundError):
        await service.update_user(
            user_id=2,
            user_update=UserUpdateRequest(username="new"),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_user_username_conflict() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2, username="old", email="old@example.com")
    repo.get_user_by_id.return_value = current_user.user
    repo.get_user_by_username.return_value = object()

    with pytest.raises(NotUniqueError):
        await service.update_user(
            user_id=2,
            user_update=UserUpdateRequest(username="taken"),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_user_email_conflict() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2, username="old", email="old@example.com")
    repo.get_user_by_id.return_value = current_user.user
    repo.get_user_by_username.return_value = None
    repo.get_user_by_email.return_value = object()

    with pytest.raises(NotUniqueError):
        await service.update_user(
            user_id=2,
            user_update=UserUpdateRequest(username="new", email="taken@example.com"),
            current_user=current_user,
            db=_fake_db(),
        )


@pytest.mark.anyio
async def test_update_user_success() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2, username="old", email="old@example.com")
    repo.get_user_by_id.return_value = current_user.user
    repo.get_user_by_username.return_value = None
    repo.get_user_by_email.return_value = None
    repo.update_user.return_value = SimpleNamespace(id=2, username="new")

    result = await service.update_user(
        user_id=2,
        user_update=UserUpdateRequest(username="new", email="new@example.com"),
        current_user=current_user,
        db=_fake_db(),
    )

    assert result.id == 2


@pytest.mark.anyio
async def test_update_user_with_unchanged_fields_skips_uniqueness_checks() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2, username="same", email="same@example.com")
    repo.get_user_by_id.return_value = current_user.user
    repo.update_user.return_value = current_user.user

    result = await service.update_user(
        user_id=2,
        user_update=UserUpdateRequest(username="same", email="same@example.com"),
        current_user=current_user,
        db=_fake_db(),
    )

    assert result.username == "same"
    repo.get_user_by_username.assert_not_awaited()
    repo.get_user_by_email.assert_not_awaited()


@pytest.mark.anyio
async def test_delete_user_unauthorized() -> None:
    service, _repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2)

    with pytest.raises(NotAuthorizedToDeleteUserError):
        await service.delete_user(user_id=1, current_user=current_user, db=_fake_db())


@pytest.mark.anyio
async def test_delete_user_not_found() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2)
    repo.get_user_by_id.return_value = None

    with pytest.raises(UserNotFoundError):
        await service.delete_user(user_id=2, current_user=current_user, db=_fake_db())


@pytest.mark.anyio
async def test_delete_user_success() -> None:
    service, repo = _service_with_mock_repo()
    current_user = _current_user_context(user_id=2)
    repo.get_user_by_id.return_value = SimpleNamespace(id=2)

    await service.delete_user(user_id=2, current_user=current_user, db=_fake_db())

    repo.delete_user.assert_awaited_once()


@pytest.mark.anyio
async def test_create_access_token_collects_role_and_permissions(monkeypatch: pytest.MonkeyPatch) -> None:
    service, repo = _service_with_mock_repo()
    repo.get_user_role_name.return_value = "editor"
    repo.get_user_permissions.return_value = [SimpleNamespace(name="buildings.write")]

    monkeypatch.setattr(user_service_module, "create_token", lambda *args, **kwargs: "jwt-token")

    token = await service._create_access_token(user_id=8, db=_fake_db())

    assert token == "jwt-token"


@pytest.mark.anyio
async def test_create_refresh_token_uses_refresh_type(monkeypatch: pytest.MonkeyPatch) -> None:
    service, _repo = _service_with_mock_repo()

    captured: dict[str, object] = {}

    def fake_create_token(user_id: int, **kwargs) -> str:
        captured["user_id"] = user_id
        captured.update(kwargs)
        return "refresh-token"

    monkeypatch.setattr(user_service_module, "create_token", fake_create_token)

    token = await service._create_refresh_token(user_id=11)

    assert token == "refresh-token"
    assert captured["user_id"] == 11
    assert captured["token_type"] == "refresh"
