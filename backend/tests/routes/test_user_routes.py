from httpx import AsyncClient, Response
from fastapi import status
import pytest

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
from backend.routes.api import user_routes


@pytest.mark.anyio
async def test_register_user_success(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_register_user(**_kwargs):
        return {"id": 1, "username": "newuser", "email": "newuser@example.com"}

    monkeypatch.setattr(user_routes.service, "register_user", fake_register_user)

    response: Response = await client.post(
        "/api/users/register",
        json={"username": "newuser", "email": "newuser@example.com", "password": "securepassword123"},
    )

    assert response.status_code == status.HTTP_201_CREATED
    assert response.json()["username"] == "newuser"


@pytest.mark.anyio
async def test_register_user_conflict_maps_400(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_register_user(**_kwargs):
        raise NotUniqueError("email")

    monkeypatch.setattr(user_routes.service, "register_user", fake_register_user)

    response: Response = await client.post(
        "/api/users/register",
        json={"username": "u", "email": "e@example.com", "password": "securepassword123"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.json()["detail"] == "Email already exists."


@pytest.mark.anyio
async def test_login_user_success(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_login_user(**_kwargs):
        return {"access_token": "access", "refresh_token": "refresh", "token_type": "bearer"}

    monkeypatch.setattr(user_routes.service, "login_user", fake_login_user)

    response: Response = await client.post(
        "/api/users/login",
        data={"username": "testuser", "password": "TestPassword123!"},
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["access_token"] == "access"


@pytest.mark.anyio
async def test_login_user_bad_credentials_maps_401(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_login_user(**_kwargs):
        raise IncorrectUsernameOrPasswordError()

    monkeypatch.setattr(user_routes.service, "login_user", fake_login_user)

    response: Response = await client.post(
        "/api/users/login",
        data={"username": "testuser", "password": "bad"},
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_refresh_token_success(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_refresh_token(**_kwargs):
        return {"access_token": "a", "refresh_token": "r", "token_type": "bearer"}

    monkeypatch.setattr(user_routes.service, "refresh_token", fake_refresh_token)

    response: Response = await client.post("/api/users/refresh", json={"token": "t"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["refresh_token"] == "r"


@pytest.mark.anyio
async def test_refresh_token_invalid_maps_401(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_refresh_token(**_kwargs):
        raise InvalidOrExpiredRefreshToken()

    monkeypatch.setattr(user_routes.service, "refresh_token", fake_refresh_token)

    response: Response = await client.post("/api/users/refresh", json={"token": "bad"})

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_get_current_user_success(client: AsyncClient) -> None:
    response: Response = await client.get("/api/users/me", headers={"Authorization": "Bearer test"})

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["username"] == "testuser"


@pytest.mark.anyio
async def test_forgot_password_success(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_forgot_password(**_kwargs):
        return {"message": "ok"}

    monkeypatch.setattr(user_routes.service, "forgot_password", fake_forgot_password)

    response: Response = await client.post("/api/users/forgot-password", json={"email": "test@example.com"})

    assert response.status_code == status.HTTP_202_ACCEPTED


@pytest.mark.anyio
async def test_reset_password_invalid_token_maps_400(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_reset_password(**_kwargs):
        raise InvalidOrExpiredPasswordResetTokenError()

    monkeypatch.setattr(user_routes.service, "reset_password", fake_reset_password)

    response: Response = await client.post(
        "/api/users/reset-password",
        json={"token": "bad", "new_password": "NewPassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_change_password_error_mapping(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_change_password(**_kwargs):
        raise IncorrectCurrentPasswordError()

    monkeypatch.setattr(user_routes.service, "change_password", fake_change_password)

    response: Response = await client.patch(
        "/api/users/me/change-password",
        headers={"Authorization": "Bearer test"},
        json={"current_password": "OldPassword123!", "new_password": "NewPassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST

    async def fake_same_password(**_kwargs):
        raise SamePasswordError()

    monkeypatch.setattr(user_routes.service, "change_password", fake_same_password)

    response = await client.patch(
        "/api/users/me/change-password",
        headers={"Authorization": "Bearer test"},
        json={"current_password": "SamePassword123!", "new_password": "SamePassword123!"},
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_get_user_success_and_not_found(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_user(**_kwargs):
        return {"id": 1, "username": "testuser"}

    monkeypatch.setattr(user_routes.service, "get_user", fake_get_user)

    response: Response = await client.get("/api/users/1")
    assert response.status_code == status.HTTP_200_OK

    async def fake_get_user_not_found(**_kwargs):
        raise UserNotFoundError()

    monkeypatch.setattr(user_routes.service, "get_user", fake_get_user_not_found)

    response = await client.get("/api/users/1")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.anyio
async def test_update_user_mappings(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_update_success(**_kwargs):
        return {"id": 1, "username": "updated", "email": "updated@example.com"}

    monkeypatch.setattr(user_routes.service, "update_user", fake_update_success)

    response: Response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated", "email": "updated@example.com"},
    )
    assert response.status_code == status.HTTP_200_OK

    async def fake_update_forbidden(**_kwargs):
        raise NotAuthorizedToUpdateUserError()

    monkeypatch.setattr(user_routes.service, "update_user", fake_update_forbidden)
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN

    async def fake_update_not_found(**_kwargs):
        raise UserNotFoundError()

    monkeypatch.setattr(user_routes.service, "update_user", fake_update_not_found)
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND

    async def fake_update_not_unique(**_kwargs):
        raise NotUniqueError("username")

    monkeypatch.setattr(user_routes.service, "update_user", fake_update_not_unique)
    response = await client.patch(
        "/api/users/1",
        headers={"Authorization": "Bearer test"},
        json={"username": "updated"},
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_delete_user_mappings(client: AsyncClient, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_delete_success(**_kwargs):
        return None

    monkeypatch.setattr(user_routes.service, "delete_user", fake_delete_success)

    response: Response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_204_NO_CONTENT

    async def fake_delete_forbidden(**_kwargs):
        raise NotAuthorizedToDeleteUserError()

    monkeypatch.setattr(user_routes.service, "delete_user", fake_delete_forbidden)
    response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_403_FORBIDDEN

    async def fake_delete_not_found(**_kwargs):
        raise UserNotFoundError()

    monkeypatch.setattr(user_routes.service, "delete_user", fake_delete_not_found)
    response = await client.delete("/api/users/1", headers={"Authorization": "Bearer test"})
    assert response.status_code == status.HTTP_404_NOT_FOUND
