import pytest
from fastapi import status
from httpx import AsyncClient, Response
from unittest.mock import AsyncMock, patch
from backend.tests.conftest import (
    TEST_EMAIL, TEST_PASSWORD, TEST_USERNAME, auth_header, login_user, register_and_login_user,
    register_test_user
)


@pytest.mark.anyio
async def test_register_user_success(client: AsyncClient) -> None:
	new_user_data: dict[str, str] = {
		"username": "newuser",
		"email": "newuser@example.com",
		"password": "securepassword123"
	}

	response: Response = await client.post(
		"/api/users/register",
		json=new_user_data
	)

	assert response.status_code == status.HTTP_201_CREATED

	response_data = response.json()

	assert response_data["username"] == new_user_data["username"]
	assert response_data["email"] == new_user_data["email"]
	assert "id" in response_data
	assert "password" not in response_data
	assert "password_hash" not in response_data


@pytest.mark.anyio
async def test_register_user_validation_error(client: AsyncClient) -> None:
    response: Response = await client.post(
		"/api/users/register",
		json={"username": TEST_USERNAME}
	)

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
    assert "email" in response.text
    assert "password" in response.text


@pytest.mark.anyio
async def test_register_user_existing_email(client: AsyncClient) -> None:
	await register_test_user(client)

	response: Response = await client.post(
		"/api/users/register",
		json={
			"username": "different_user",
			"email": TEST_EMAIL.lower(),
			"password": TEST_PASSWORD
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "Email already exists."


@pytest.mark.anyio
async def test_register_user_existing_username(client: AsyncClient) -> None:
	await register_test_user(client)

	response: Response = await client.post(
		"/api/users/register",
		json={
			"username": TEST_USERNAME.lower(),
			"email": "different_test@example.com",
			"password": TEST_PASSWORD
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "Username already exists."


@pytest.mark.anyio
async def test_register_user_with_too_short_password(client: AsyncClient) -> None:
	for i in range(1, 8):
		response: Response = await client.post(
			"/api/users/register",
			json={
				"username": TEST_USERNAME,
				"email": TEST_EMAIL,
				"password": "a" * i
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
		assert response_data["detail"][0]["type"] == "string_too_short"
		assert "password" in response_data["detail"][0]["loc"]


@pytest.mark.anyio
async def test_register_user_with_invalid_email(client: AsyncClient) -> None:
	invalid_emails: list[str] = [
		"test",
		"test@",
		"test@example",
		"test@example.",
		"@example.com",
		"example.com",
		".com"
	]

	for email in invalid_emails:
		response: Response = await client.post(
			"api/users/register",
			json={
				"username": TEST_USERNAME,
				"email": email,
				"password": TEST_PASSWORD
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
		assert response_data["detail"][0]["type"] == "value_error"
		assert "email" in response_data["detail"][0]["loc"]


@pytest.mark.anyio
async def test_login_user_success(client: AsyncClient) -> None:
	await register_test_user(client)

	for username in [TEST_USERNAME, TEST_EMAIL]:
		response: Response = await client.post(
			"/api/users/login",
			data={
				"username": username,
				"password": TEST_PASSWORD
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_200_OK
		assert response_data["access_token"]
		assert response_data["refresh_token"]


@pytest.mark.anyio
async def test_login_user_incorrect_username_or_email(client: AsyncClient) -> None:
	await register_test_user(client)

	for username in ["different_user", "different_test@example.com"]:
		response: Response = await client.post(
			"/api/users/login",
			data={
				"username": username,
				"password": TEST_PASSWORD
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_401_UNAUTHORIZED
		assert response_data["detail"] == "Incorrect username/email or password."


@pytest.mark.anyio
async def test_login_user_incorrect_password(client: AsyncClient) -> None:
	await register_test_user(client)

	response: Response = await client.post(
		"/api/users/login",
		data={
			"username": TEST_USERNAME,
			"password": "wrong_password"
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_401_UNAUTHORIZED
	assert response_data["detail"] == "Incorrect username/email or password."


@pytest.mark.anyio
async def test_login_deleted_user(client: AsyncClient) -> None:
	user_id: int = (await register_test_user(client))["id"]
	access_token, _ = await login_user(client)
	header = auth_header(access_token)

	await client.delete(f"api/users/{user_id}", headers=header)

	response: Response = await client.post(f"api/users/login",
		data={
			"username": TEST_USERNAME,
			"password": TEST_PASSWORD
		}
  	)

	response_data = response.json()

	assert response.status_code == status.HTTP_401_UNAUTHORIZED
	assert response_data["detail"] == "Incorrect username/email or password."


@pytest.mark.anyio
async def test_get_user_success(client: AsyncClient) -> None:
	user_id: int = (await register_test_user(client))["id"]

	response: Response = await client.get(f"/api/users/{user_id}")

	response_data = response.json()

	assert response.status_code == status.HTTP_200_OK
	assert response_data["id"] == user_id
	assert response_data["username"] == TEST_USERNAME
	assert "email" not in response_data
	assert "password" not in response_data
	assert "password_hash" not in response_data


@pytest.mark.anyio
async def test_get_user_non_existent_user(client: AsyncClient) -> None:
    response: Response = await client.get("/api/users/0")

    response_data = response.json()

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert response_data["detail"] == "User not found."


@pytest.mark.anyio
async def test_get_current_user(client: AsyncClient) -> None:
    user_id: int = (await register_test_user(client))["id"]
    access_token, _ = await login_user(client)
    header = auth_header(access_token)

    response: Response = await client.get("/api/users/me", headers=header)

    response_data = response.json()

    assert response.status_code == status.HTTP_200_OK
    assert response_data["id"] == user_id
    assert response_data["username"] == TEST_USERNAME
    assert response_data["email"] == TEST_EMAIL
    assert "password" not in response_data
    assert "password_hash" not in response_data


@pytest.mark.anyio
async def test_update_user_success(client: AsyncClient) -> None:
	user_id: int = (await register_test_user(client))["id"]
	access_token, _ = await login_user(client)
	header = auth_header(access_token)

	new_user_data: dict[str, str] = {
		"username": "new_username",
		"email": "new@example.com",
		"password": "NewPassword123"
	}

	response: Response = await client.patch(
		f"/api/users/{user_id}",
		headers=header,
		json=new_user_data
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_200_OK
	assert response_data["id"] == user_id
	assert response_data["username"] == new_user_data["username"]
	assert response_data["email"] == new_user_data["email"]
	assert "password" not in response_data
	assert "password_hash" not in response_data


@pytest.mark.anyio
async def test_update_user_unauthorized(client: AsyncClient) -> None:
	user_id: int = (await register_test_user(client))["id"]

	new_user_data: dict[str, str] = {
		"username": "new_username",
		"email": "new@example.com",
		"password": "NewPassword123"
	}

	response: Response = await client.patch(
		f"/api/users/{user_id}",
		json=new_user_data
	)

	assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_update_user_username_already_exists(client: AsyncClient) -> None:
	await register_test_user(client)

	different_user_data: dict[str, str] = {
		"username": "different_user",
		"email": "different@example.com"
	}

	user_id: int = (await register_test_user(client, **different_user_data))["id"]
	access_token, _ = await login_user(client, **different_user_data)
	header = auth_header(access_token)

	new_user_data: dict[str, str] = {
		"username": TEST_USERNAME,
		"email": "new@example.com",
		"password": "NewPassword123"
	}

	response: Response = await client.patch(
		f"/api/users/{user_id}",
		headers=header,
		json=new_user_data
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "Username already exists."


@pytest.mark.anyio
async def test_update_user_email_already_exists(client: AsyncClient) -> None:
	await register_test_user(client)

	different_user_data: dict[str, str] = {
		"username": "different_user",
		"email": "different@example.com"
	}

	user_id: int = (await register_test_user(client, **different_user_data))["id"]
	access_token, _ = await login_user(client, **different_user_data)
	header = auth_header(access_token)

	new_user_data: dict[str, str] = {
		"username": "new_user",
		"email": TEST_EMAIL,
		"password": "NewPassword123"
	}

	response: Response = await client.patch(
		f"/api/users/{user_id}",
		headers=header,
		json=new_user_data
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "Email already exists."


@pytest.mark.anyio
async def test_delete_user_success(client: AsyncClient) -> None:
    user_id: int = (await register_test_user(client))["id"]
    access_token, _ = await login_user(client)
    header = auth_header(access_token)

    response: Response = await client.delete(f"/api/users/{user_id}", headers=header)

    assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.anyio
async def test_delete_user_different_user_fail(client: AsyncClient) -> None:
	different_user_id: int = (await register_test_user(
		client,
		username="different_user",
		email="different@example.com"
	))["id"]

	await register_test_user(client)
	access_token, _ = await login_user(client)
	header = auth_header(access_token)

	response: Response = await client.delete(f"api/users/{different_user_id}", headers=header)

	assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.anyio
async def test_delete_user_unauthorized(client: AsyncClient) -> None:
    user_id: int = (await register_test_user(client))["id"]
    await login_user(client)

    response: Response = await client.delete(f"/api/users/{user_id}")

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.anyio
async def test_password_reset_success(client: AsyncClient) -> None:
	await register_test_user(client)

	with patch(
		"backend.services.user_service.send_password_reset_email",
		new_callable=AsyncMock
	) as mock_send:
		await client.post(
			"/api/users/forgot-password",
			json={"email": TEST_EMAIL}
		)

		reset_token: str = mock_send.call_args.kwargs["token"]

	response: Response = await client.post(
		"/api/users/reset-password",
		json={
			"token": reset_token,
			"new_password": "NewPassword123!"
		}
	)

	assert response.status_code == status.HTTP_200_OK


@pytest.mark.anyio
async def test_password_reset_invalid_reset_token(client: AsyncClient) -> None:
	response: Response = await client.post(
		"/api/users/reset-password",
		json={
			"token": "invalid_token",
			"new_password": "NewPassword123!"
		}
	)

	assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.anyio
async def test_password_reset_password_too_short(client: AsyncClient) -> None:
	await register_test_user(client)

	with patch(
		"backend.services.user_service.send_password_reset_email",
		new_callable=AsyncMock
	) as mock_send:
		await client.post(
			"/api/users/forgot-password",
			json={"email": TEST_EMAIL}
		)

		reset_token: str = mock_send.call_args.kwargs["token"]

	for i in range(1, 8):
		response: Response = await client.post(
			"/api/users/reset-password",
			json={
				"token": reset_token,
				"new_password": "a" * i
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
		assert response_data["detail"][0]["type"] == "string_too_short"
		assert "new_password" in response_data["detail"][0]["loc"]


@pytest.mark.anyio
async def test_forgot_password_sends_email(client: AsyncClient) -> None:
    await register_test_user(client)

    with patch(
		"backend.services.user_service.send_password_reset_email",
		new_callable=AsyncMock
	) as mock_send:
        response = await client.post(
			"/api/users/forgot-password",
			json={"email": TEST_EMAIL}
		)

        assert response.status_code == status.HTTP_202_ACCEPTED

        mock_send.assert_awaited_once()
        call_kwargs = mock_send.call_args.kwargs

        assert call_kwargs["to_email"] == TEST_EMAIL
        assert call_kwargs["username"] == TEST_USERNAME
        assert "token" in call_kwargs


@pytest.mark.anyio
async def test_change_password_success(client: AsyncClient) -> None:
	header = await register_and_login_user(client)

	new_password = "NewPassword123!"

	response: Response = await client.patch(
		"/api/users/me/change-password",
		headers=header,
		json={
			"current_password": TEST_PASSWORD,
			"new_password": new_password
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_200_OK
	assert response_data["message"] == "Password changed successfully."

	response = await client.post(
		"/api/users/login",
		data={
			"username": TEST_USERNAME,
			"password": new_password
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_200_OK
	assert response_data["access_token"]
	assert response_data["refresh_token"]


@pytest.mark.anyio
async def test_change_password_wrong_password(client: AsyncClient) -> None:
	header = await register_and_login_user(client)

	response: Response = await client.patch(
		"/api/users/me/change-password",
		headers=header,
		json={
			"current_password": "WrongPassword123!",
			"new_password": "NewPassword123!"
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "Current password is incorrect."


@pytest.mark.anyio
async def test_change_password_same_password(client: AsyncClient) -> None:
	header = await register_and_login_user(client)

	response: Response = await client.patch(
		"/api/users/me/change-password",
		headers=header,
		json={
			"current_password": TEST_PASSWORD,
			"new_password": TEST_PASSWORD
		}
	)

	response_data = response.json()

	assert response.status_code == status.HTTP_400_BAD_REQUEST
	assert response_data["detail"] == "The new password cannot be the same as the current password."


@pytest.mark.anyio
async def test_change_password_too_short(client: AsyncClient) -> None:
	header = await register_and_login_user(client)

	for i in range(1, 8):
		response: Response = await client.patch(
			"/api/users/me/change-password",
			headers=header,
			json={
				"current_password": "WrongPassword123!",
				"new_password": "a" * i
			}
		)

		response_data = response.json()

		assert response.status_code == status.HTTP_422_UNPROCESSABLE_CONTENT
		assert response_data["detail"][0]["type"] == "string_too_short"
		assert "new_password" in response_data["detail"][0]["loc"]
