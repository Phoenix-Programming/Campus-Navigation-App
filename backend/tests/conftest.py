import os
from collections.abc import AsyncGenerator
from typing import Final


TEST_USERNAME: Final[str] = "testuser"
TEST_EMAIL: Final[str] = "test@example.com"
TEST_PASSWORD: Final[str] = "TestPassword123!"


os.environ["DB_URL"] = (
	"postgresql+psycopg://test_user:testpassword123@localhost/test-fl-poly-campus-map"
)
os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"


import pytest
from httpx import ASGITransport, AsyncClient, Response
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import (
    AsyncEngine, AsyncConnection, AsyncSession, AsyncTransaction, async_sessionmaker,
    create_async_engine
)
from sqlalchemy.pool import NullPool
from backend.main import app
from backend.schema.permissions import Role
from backend.utilities.db_connection import Base, get_db


pytest_plugins = ["anyio"]


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture(scope="session")
def test_engine() -> AsyncEngine:
    engine: AsyncEngine = create_async_engine(
		os.environ["DB_URL"],
		poolclass=NullPool
	)
    return engine


@pytest.fixture(scope="session")
async def setup_database(test_engine):
	async with test_engine.begin() as conn:
		await conn.run_sync(Base.metadata.create_all)

		await conn.execute(insert(Role), [
			{"id": 0, "name": "admin"},
			{"id": 1, "name": "editor"},
			{"id": 2, "name": "user"}
		])
		await conn.commit()

	yield

	async with test_engine.begin() as conn:
		await conn.run_sync(Base.metadata.drop_all)

	await test_engine.dispose()


@pytest.fixture
async def db_session(
	test_engine: AsyncEngine,
	setup_database
) -> AsyncGenerator[AsyncSession]:
    conn: AsyncConnection = await test_engine.connect()
    trans: AsyncTransaction = await conn.begin()

    test_async_session: async_sessionmaker[AsyncSession] = async_sessionmaker(
		bind=conn,
		class_=AsyncSession,
		expire_on_commit=False,
		join_transaction_mode="create_savepoint"
	)

    async with test_async_session() as session:
        try:
            yield session
        finally:
            await session.close()
            await trans.rollback()
            await conn.close()


@pytest.fixture
async def client(
	db_session: AsyncSession
) -> AsyncGenerator[AsyncClient]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
		transport=ASGITransport(app=app),
		base_url="http://test"
	) as ac:
        yield ac

    app.dependency_overrides.clear()


async def register_test_user(
	client: AsyncClient,
	username: str = TEST_USERNAME,
	email: str = TEST_EMAIL,
	password: str = TEST_PASSWORD
) -> dict:
    response: Response = await client.post(
		"/api/users/register",
		json={
			"username": username,
			"email": email,
			"password": password
		}
	)

    assert response.status_code == 201, f"Failed to create user: {response.text}"

    return response.json()


async def login_user(
	client: AsyncClient,
	username: str | None = TEST_USERNAME,
	email: str = TEST_EMAIL,
	password: str = TEST_PASSWORD
) -> tuple[str, str]:
    response: Response = await client.post(
		"/api/users/login",
		data={
			"username": username if username else email,
			"password": password
		}
	)

    assert response.status_code == 200, f"Failed to login: {response.text}"

    return (response.json()["access_token"], response.json()["refresh_token"])


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def register_and_login_user(
	client: AsyncClient,
	username: str = TEST_USERNAME,
	email: str = TEST_EMAIL,
	password: str = TEST_PASSWORD
) -> dict[str, str]:
    await register_test_user(
        client,
        username=username,
        email=email,
        password=password
    )
    access_token, _ = await login_user(client,
        username=username,
        email=email,
        password=password
    )
    return auth_header(access_token)
