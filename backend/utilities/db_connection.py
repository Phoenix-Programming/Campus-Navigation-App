from fastapi import Depends
from sqlalchemy import MetaData
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from typing import Annotated
from backend.settings import settings


POSTGRES_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

engine: AsyncEngine = create_async_engine(
    f"postgresql+psycopg://{settings.db_username}:{settings.db_password.get_secret_value()}@{settings.db_host}/{settings.db_name}",
    echo=settings.env == "DEV"
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=POSTGRES_CONVENTION)


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


Database = Annotated[AsyncSession, Depends(get_db)]
