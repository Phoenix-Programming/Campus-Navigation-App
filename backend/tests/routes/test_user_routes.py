from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import status
from httpx import AsyncClient, Response

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
from backend.main import app
from backend.routes import dependencies as route_dependencies


@pytest.mark.anyio
async def test_register_user_success(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        register_user=AsyncMock(return_value={"id": 1, "username": "newuser", "email": "newuser@example.com"})
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/users/register",
        json={"username": "newuser", "email": "newuser@example.com", "password": "securepassword123"},
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["username"] == "newuser"


@pytest.mark.anyio
async def test_register_user_conflict_maps_400(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        register_user=AsyncMock(side_effect=NotUniqueError("email"))
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/users/register",
        json={"username": "u", "email": "e@example.com", "password": "securepassword123"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email already exists."


@pytest.mark.anyio
async def test_login_user_success(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        login_user=AsyncMock(return_value={"access_token": "access", "refresh_token": "refresh", "token_type": "bearer"})
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/users/login",
        data={"username": "testuser", "password": "TestPassword123!"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["access_token"] == "access"


@pytest.mark.anyio
async def test_login_user_bad_credentials_maps_401(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        login_user=AsyncMock(side_effect=IncorrectUsernameOrPasswordError())
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/users/login",
        data={"username": "testuser", "password": "bad"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_refresh_token_success(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        refresh_token=AsyncMock(return_value={"access_token": "a", "refresh_token": "r", "token_type": "bearer"})
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post("/api/users/refresh", json={"token": "t"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["refresh_token"] == "r"


@pytest.mark.anyio
async def test_refresh_token_invalid_maps_401(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        refresh_token=AsyncMock(side_effect=InvalidOrExpiredRefreshToken())
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post("/api/users/refresh", json={"token": "bad"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_get_current_user_success(client: AsyncClient) -> None:
    response: Response = await client.get("/api/users/me", headers={"Authorization": "Bearer test"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "testuser"


@pytest.mark.anyio
async def test_forgot_password_success(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        forgot_password=AsyncMock(return_value={"message": "ok"})
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post("/api/users/forgot-password", json={"email": "test@example.com"})

    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.anyio
async def test_reset_password_invalid_token_maps_400(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        reset_password=AsyncMock(side_effect=InvalidOrExpiredPasswordResetTokenError())
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.post(
        "/api/users/reset-password",
        json={"token": "bad", "new_password": "NewPassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_change_password_error_mapping(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(
        change_password=AsyncMock(side_effect=IncorrectCurrentPasswordError())
    )
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.patch(
        "/api/users/me/change-password",
        headers={"Authorization": "Bearer test"},
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST

    fake_service.change_password.side_effect = SamePasswordError()
    response = await client.patch(
        "/api/users/me/change-password",
        headers={"Authorization": "Bearer test"},
        json={"current_password": "SamePassword123!", "new_password": "SamePassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_get_user_success_and_not_found(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(get_user=AsyncMock(return_value={"id": 1, "username": "testuser"}))
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.get("/api/users/1")
    assert response.status_code == status.HTTP_200_OK

    fake_service.get_user.side_effect = UserNotFoundError()
    response = await client.get("/api/users/1")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_update_user_mappings(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(update_user=AsyncMock(return_value={"id": 1, "username": "updated", "email": "updated@example.com"}))
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated", "email": "updated@example.com"},
    )
    assert response.status_code == status.HTTP_200_OK

    fake_service.update_user.side_effect = NotAuthorizedToUpdateUserError()
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

    fake_service.update_user.side_effect = UserNotFoundError()
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    fake_service.update_user.side_effect = NotUniqueError("username")
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_delete_user_mappings(client: AsyncClient) -> None:
    fake_service = SimpleNamespace(delete_user=AsyncMock(return_value=None))
    app.dependency_overrides[route_dependencies._get_user_service] = lambda: fake_service

    response: Response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_204_NO_CONTENT

    fake_service.delete_user.side_effect = NotAuthorizedToDeleteUserError()
    response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    fake_service.delete_user.side_effect = UserNotFoundError()
    response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_404_NOT_FOUND
