import os
from collections.abc import AsyncGenerator
from types import SimpleNamespace
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient


os.environ.setdefault("DB_NAME", "test-fl-poly-campus-map")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_USERNAME", "test_user")
os.environ.setdefault("DB_PASSWORD", "testpassword123")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing-only")
os.environ.setdefault("JWT_ALGORITHM", "HS256")
os.environ.setdefault("ACCESS_TOKEN_EXPIRE_MINUTES", "30")
os.environ.setdefault("RESET_TOKEN_EXPIRE_MINUTES", "60")
os.environ.setdefault("STANDARD_REFRESH_TOKEN_EXPIRE_MINUTES", "1440")
os.environ.setdefault("LONG_LIVED_REFRESH_TOKEN_EXPIRE_MINUTES", "129600")
os.environ.setdefault("SLIDING_REFRESH_WINDOW_DAYS", "7")
os.environ.setdefault("REFRESH_TOKEN_PRUNE_AFTER_DAYS", "14")
os.environ.setdefault("FRONTEND_URL", "http://localhost:5173")
os.environ.setdefault("MAIL_SERVER", "smtp.test.local")
os.environ.setdefault("MAIL_PORT", "465")
os.environ.setdefault("MAIL_SYSTEM_EMAIL", "noreply@example.com")
os.environ.setdefault("MAIL_SYSTEM_USERNAME", "test-user")
os.environ.setdefault("MAIL_SYSTEM_PASSWORD", "test-password")
os.environ.setdefault("MAIL_PRIMARY_EMAIL", "primary@example.com")
os.environ.setdefault("MAIL_SUPPORT_EMAIL", "support@example.com")

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
