import asyncio
import httpx
from sqlalchemy import delete
from backend.database.db_connection import AsyncSessionLocal, engine
from backend.main import app
from backend.repositories.schema.password_reset_token import PasswordResetToken
from backend.repositories.schema.user import User
from .data import USERS


async def clear_existing_data() -> None:
	async with AsyncSessionLocal() as db:
		await db.execute(delete(User))
		await db.execute(delete(PasswordResetToken))

		await db.commit()

	print("Cleared existing data.")


async def populate() -> None:
    transport: httpx.ASGITransport = httpx.ASGITransport(app=app)

    async with httpx.AsyncClient(
		transport=transport,
		base_url="http://localhost",
	) as client:
        await clear_existing_data()

        print(f"\nCreating {len(USERS)} users...")
        for user_data in USERS:
            response: httpx.Response = await client.post(
				"/api/users/create",
				json={
					"username": user_data["username"],
					"email": user_data["email"],
					"password": user_data["password"]
				}
			)
            response.raise_for_status()
            user: dict[str, str] = response.json()
            print(f"  Created: {user["username"]}")

    await engine.dispose()

    print("\nDone!")
    print(f"  {len(USERS)} users")


if __name__ == "__main__": asyncio.run(populate())
