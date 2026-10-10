import asyncio
import httpx
from sqlalchemy import delete, insert, select, update
from backend.utilities.db_connection import AsyncSessionLocal, engine
from backend.main import app
from backend.schema.building import Building
from backend.schema.floor import Floor
from backend.schema.password_reset_token import PasswordResetToken
from backend.schema.user import User
from .data import USERS, BUILDINGS, FLOORS


async def clear_existing_data() -> None:
	async with AsyncSessionLocal() as db:
		await db.execute(delete(Floor))
		await db.execute(delete(Building))
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

		first_user_id: int = -1

		print(f"\nCreating {len(USERS)} users...")
		for user_data in USERS:
			response: httpx.Response = await client.post(
				"/api/users/register",
				json={
					"username": user_data["username"],
					"email": user_data["email"],
					"password": user_data["password"]
				}
			)
			response.raise_for_status()
			user: dict[str, str] = response.json()
			if first_user_id == -1: first_user_id = int(user["id"])

			async with AsyncSessionLocal() as db:
				await db.execute(
					update(User)
					.where(User.username == user_data["username"])
					.values(role_id=user_data["role_id"])
				)
				await db.commit()

			print(f"  Created: {user["username"]}")

		for building_data in BUILDINGS:
			async with AsyncSessionLocal() as db:
				await db.execute(
					insert(Building).values(
						name=building_data["name"],
						code=building_data["code"],
						address=building_data["address"],
						category_id=building_data["category_id"],
						num_floors=building_data["num_floors"],
						last_updated_by=first_user_id
					)
				)
				await db.commit()

		for floor_data in FLOORS:
			async with AsyncSessionLocal() as db:
				bld_id = await db.scalar(
					select(Building.id).where(Building.code == floor_data["bld_code"])
				)

				await db.execute(
					insert(Floor).values(
						building_id=bld_id,
						floor_num=floor_data["floor_num"],
						svg=floor_data["svg"],
						last_updated_by=first_user_id
					)
				)
				await db.commit()

	await engine.dispose()

	print("\nDone!")
	print(f"  {len(USERS)} users")


if __name__ == "__main__": asyncio.run(populate())
