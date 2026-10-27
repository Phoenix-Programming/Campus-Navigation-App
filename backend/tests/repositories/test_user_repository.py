from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from typing import Any, cast
from unittest.mock import AsyncMock, MagicMock

import pytest

from backend.exceptions import UserNotFoundError
from backend.repositories.user_repository import UserRepository
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.permissions import Permission, Role
from backend.schema.user import User


class ExplodingUser:
    @property
    def username(self):
        return "x"

    @username.setter
    def username(self, _value):
        raise RuntimeError("boom")

    @property
    def email(self):
        return "x@example.com"

    @email.setter
    def email(self, _value):
        raise RuntimeError("boom")

    @property
    def password_hash(self):
        return "hash"

    @password_hash.setter
    def password_hash(self, _value):
        raise RuntimeError("boom")


def _scalar_result(first=None, all_values=None):
    scalars = MagicMock()
    scalars.first.return_value = first
    scalars.all.return_value = all_values if all_values is not None else []
    result = MagicMock()
    result.scalars.return_value = scalars
    return result


@pytest.mark.anyio
async def test_insert_user_success() -> None:
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_scalar_result(first=Role(id=2, name="user"))),
        add=MagicMock(),
        commit=AsyncMock(),
        refresh=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    created = await repo.insert_user(
        username="NewUser",
        email="UPPER@example.com",
        password_hash="hash",
        role_name="user",
    )

    assert created.username == "NewUser"
    assert created.email == "upper@example.com"
    assert created.role_id == 2
    db.commit.assert_awaited_once()
    db.refresh.assert_awaited_once()


@pytest.mark.anyio
async def test_user_lookup_helpers_return_scalars() -> None:
    user = User(id=1, username="u", email="u@example.com", password_hash="h", role_id=2)
    db = SimpleNamespace(
        execute=AsyncMock(
            side_effect=[
                _scalar_result(first=user),
                _scalar_result(first=user),
                _scalar_result(first=user),
                _scalar_result(first="admin"),
                _scalar_result(first=SimpleNamespace(token_hash="abc")),
                _scalar_result(first=SimpleNamespace(token_hash="def")),
            ]
        )
    )
    repo = UserRepository(db=cast(Any, db))

    by_id = await repo.get_user_by_id(1)
    by_email = await repo.get_user_by_email("u@example.com")
    by_username = await repo.get_user_by_username("u")
    role_name = await repo.get_user_role_name(1)
    refresh = await repo.get_matching_refresh_token("abc")
    reset = await repo.get_password_reset_token_by_token_hash("def")

    assert by_id is user
    assert by_email is user
    assert by_username is user
    assert role_name == "admin"
    assert refresh is not None
    assert reset is not None


@pytest.mark.anyio
async def test_update_user_and_password_hash_success() -> None:
    db = SimpleNamespace(rollback=AsyncMock())
    user = User(id=1, username="old", email="old@example.com", password_hash="old", role_id=2)
    repo = UserRepository(db=cast(Any, db))

    updated_user = await repo.update_user(user=user, username="NEW", email="NEW@EXAMPLE.COM")
    updated_password_user = await repo.update_user_password_hash(
        user=user,
        password_hash="new-hash",
    )

    assert updated_user.username == "new"
    assert updated_user.email == "new@example.com"
    assert updated_password_user.password_hash == "new-hash"


@pytest.mark.anyio
async def test_delete_user_success() -> None:
    db = SimpleNamespace(delete=AsyncMock(), commit=AsyncMock(), rollback=AsyncMock())
    repo = UserRepository(db=cast(Any, db))

    await repo.delete_user(user=cast(User, SimpleNamespace()))

    db.delete.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.anyio
async def test_refresh_and_reset_token_insert_success_paths() -> None:
    db = SimpleNamespace(add=MagicMock(), commit=AsyncMock(), rollback=AsyncMock())
    repo = UserRepository(db=cast(Any, db))

    await repo.insert_refresh_token(
        user_id=1,
        token_hash="refresh",
        is_long_lived=False,
        expires_at=datetime.now(UTC) + timedelta(minutes=15),
    )
    await repo.insert_password_reset_token(
        user_id=1,
        token_hash="reset",
        expires_at=datetime.now(UTC) + timedelta(minutes=30),
    )

    assert db.add.call_count == 2
    assert db.commit.await_count == 2


@pytest.mark.anyio
async def test_revoke_all_refresh_tokens_marks_non_revoked_tokens() -> None:
    token_a = SimpleNamespace(is_revoked=False)
    token_b = SimpleNamespace(is_revoked=False)
    db = SimpleNamespace(execute=AsyncMock(return_value=_scalar_result(all_values=[token_a, token_b])))
    repo = UserRepository(db=cast(Any, db))

    await repo.revoke_all_refresh_tokens_for_user(user_id=1)

    assert token_a.is_revoked is True
    assert token_b.is_revoked is True


@pytest.mark.anyio
async def test_delete_all_password_reset_tokens_success() -> None:
    db = SimpleNamespace(execute=AsyncMock(), commit=AsyncMock(), rollback=AsyncMock())
    repo = UserRepository(db=cast(Any, db))

    await repo.delete_all_password_reset_tokens_for_user(
        user=cast(User, SimpleNamespace(id=1)),
    )

    db.execute.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()


@pytest.mark.anyio
async def test_insert_user_rolls_back_on_commit_error() -> None:
    db = SimpleNamespace(
        execute=AsyncMock(return_value=_scalar_result(first=Role(id=2, name="user"))),
        add=MagicMock(),
        commit=AsyncMock(side_effect=RuntimeError("commit failed")),
        refresh=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.insert_user(
            username="u",
            email="u@example.com",
            password_hash="hash",
            role_name="user",
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_update_user_rolls_back_when_assignment_fails() -> None:
    db = SimpleNamespace(rollback=AsyncMock())
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="boom"):
        await repo.update_user(user=cast(User, ExplodingUser()), username="new")

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_update_user_password_hash_rolls_back_when_assignment_fails() -> None:
    db = SimpleNamespace(rollback=AsyncMock())
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="boom"):
        await repo.update_user_password_hash(
            user=cast(User, ExplodingUser()),
            password_hash="new",
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_delete_user_rolls_back_on_delete_error() -> None:
    db = SimpleNamespace(
        delete=AsyncMock(side_effect=RuntimeError("delete failed")),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="delete failed"):
        await repo.delete_user(user=cast(User, SimpleNamespace()))

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_insert_refresh_token_rolls_back_on_commit_error() -> None:
    db = SimpleNamespace(
        add=MagicMock(),
        commit=AsyncMock(side_effect=RuntimeError("commit failed")),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.insert_refresh_token(
            user_id=1,
            token_hash="h",
            is_long_lived=False,
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_insert_password_reset_token_rolls_back_on_commit_error() -> None:
    db = SimpleNamespace(
        add=MagicMock(),
        commit=AsyncMock(side_effect=RuntimeError("commit failed")),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="commit failed"):
        await repo.insert_password_reset_token(
            user_id=1,
            token_hash="h",
            expires_at=datetime.now(UTC) + timedelta(minutes=5),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_delete_password_reset_token_rolls_back_on_delete_error() -> None:
    db = SimpleNamespace(
        delete=AsyncMock(side_effect=RuntimeError("delete failed")),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="delete failed"):
        await repo.delete_password_reset_token(
            token=cast(PasswordResetToken, SimpleNamespace()),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_delete_all_password_reset_tokens_rolls_back_on_execute_error() -> None:
    db = SimpleNamespace(
        execute=AsyncMock(side_effect=RuntimeError("execute failed")),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(RuntimeError, match="execute failed"):
        await repo.delete_all_password_reset_tokens_for_user(
            user=cast(User, SimpleNamespace(id=1)),
        )

    db.rollback.assert_awaited_once()


@pytest.mark.anyio
async def test_get_user_permissions_raises_when_user_missing() -> None:
    missing_user_result = _scalar_result(first=None)
    db = SimpleNamespace(execute=AsyncMock(return_value=missing_user_result))
    repo = UserRepository(db=cast(Any, db))

    with pytest.raises(UserNotFoundError):
        await repo.get_user_permissions(user_id=99)


@pytest.mark.anyio
async def test_get_user_permissions_success() -> None:
    user_result = _scalar_result(first=SimpleNamespace(id=1, role_id=2))
    permission_scalars = MagicMock()
    permission_scalars.all.return_value = [Permission(id=1, name="users.read")]
    permissions_result = MagicMock()
    permissions_result.scalars.return_value = permission_scalars

    execute = AsyncMock(side_effect=[user_result, permissions_result])
    db = SimpleNamespace(execute=execute)
    repo = UserRepository(db=cast(Any, db))

    permissions = await repo.get_user_permissions(user_id=1)

    assert [p.name for p in permissions] == ["users.read"]


@pytest.mark.anyio
async def test_get_password_reset_token_owner_returns_user() -> None:
    db = SimpleNamespace(execute=AsyncMock(return_value=_scalar_result(first=User(id=1, username="u", email="u@example.com", password_hash="h", role_id=2))))
    repo = UserRepository(db=cast(Any, db))

    owner = await repo.get_password_reset_token_owner(
        token=PasswordResetToken(user_id=1, token_hash="x", expires_at=datetime.now(UTC)),
    )

    assert owner is not None
    assert owner.id == 1


@pytest.mark.anyio
async def test_get_matching_refresh_token_returns_row() -> None:
    token_row = SimpleNamespace(token_hash="hash-1")
    db = SimpleNamespace(execute=AsyncMock(return_value=_scalar_result(first=token_row)))
    repo = UserRepository(db=cast(Any, db))

    result = await repo.get_matching_refresh_token(token_hash="hash-1")

    assert result is token_row


@pytest.mark.anyio
async def test_delete_password_reset_token_success() -> None:
    db = SimpleNamespace(
        delete=AsyncMock(),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )
    repo = UserRepository(db=cast(Any, db))

    await repo.delete_password_reset_token(
        token=cast(PasswordResetToken, SimpleNamespace()),
    )

    db.delete.assert_awaited_once()
    db.commit.assert_awaited_once()
    db.rollback.assert_not_awaited()
