import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.api_routes import router as api_router
from backend.settings import settings
from backend.tasks.prune_refresh_tokens import prune_refresh_tokens
from backend.utilities.db_connection import engine


logging.basicConfig(level=logging.INFO)
logger: logging.Logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    scheduler: AsyncIOScheduler = AsyncIOScheduler()

    scheduler.add_job(prune_refresh_tokens, CronTrigger(hour=2, minute=0, second=0))

    scheduler.start()

    yield

    # shutdown
    await engine.dispose()


app: FastAPI = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

app.include_router(api_router)
