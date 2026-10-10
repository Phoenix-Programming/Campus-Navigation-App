import os
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient


os.environ.setdefault("DB_URL", "postgresql+psycopg://test_user:testpassword123@localhost/test-fl-poly-campus-map")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-testing-only")

from backend.auth import auth as auth_module
from backend.main import app
from backend.utilities.db_connection import get_db


pytest_plugins = ["anyio"]


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def fake_db() -> Any:
    return SimpleNamespace(name="fake-db")


@pytest.fixture
def current_user_context() -> Any:
    return SimpleNamespace(
        user=SimpleNamespace(id=1, username="testuser", email="test@example.com", password_hash="hash"),
        permissions=set(),
        role="user",
    )


@pytest.fixture
def admin_user_context() -> Any:
    return SimpleNamespace(
        user=SimpleNamespace(id=999, username="admin", email="admin@example.com", password_hash="hash"),
        permissions={"buildings.write"},
        role="admin",
    )


@pytest.fixture
async def client(
    fake_db: Any,
    current_user_context: Any,
    admin_user_context: Any,
) -> AsyncGenerator[AsyncClient]:
    async def override_get_db():
        yield fake_db

    async def override_get_current_user() -> Any:
        return current_user_context

    async def override_get_admin_user() -> Any:
        return admin_user_context

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[auth_module.get_current_user] = override_get_current_user
    app.dependency_overrides[auth_module.get_admin_user] = override_get_admin_user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
