from fastapi import APIRouter
from typing import Final
from .frontend.home_routes import router as home_router


_api_routers: Final[list[APIRouter]] = [
	home_router,
]


router: APIRouter = APIRouter()

for r in _api_routers: router.include_router(r)
