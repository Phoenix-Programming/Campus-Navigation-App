from fastapi import APIRouter
from typing import Final
from .api.user_routes import router as user_router


_api_routers: Final[list[APIRouter]] = [
	user_router
]


router: APIRouter = APIRouter(prefix="/api")

for r in _api_routers: router.include_router(r)
