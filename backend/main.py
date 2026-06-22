from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.settings import settings
from backend.utilities.db_connection import engine
from backend.routes.api_routes import router as api_router


@asynccontextmanager
async def lifespan(_app: FastAPI):
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
