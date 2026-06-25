from datetime import UTC, datetime, timedelta
from sqlalchemy import delete
from backend.settings import settings
from backend.schema.active_refresh_token import ActiveRefreshToken
from backend.utilities.db_connection import AsyncSessionLocal


async def prune_refresh_tokens() -> None:
	dt: timedelta = timedelta(days=settings.refresh_token_prune_after_days)
	prune_after_expire_date: datetime = datetime.now(UTC) - dt

	async with AsyncSessionLocal() as db:
		try:
			await db.execute(
				delete(ActiveRefreshToken)
				.where(ActiveRefreshToken.is_revoked)
				.where(ActiveRefreshToken.expires_at >= prune_after_expire_date)
			)

			await db.commit()
		except:
			await db.rollback()
			raise
