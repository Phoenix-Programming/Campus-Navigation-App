from contextlib import asynccontextmanager
from fastapi import APIRouter, FastAPI, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import http_exception_handler, request_validation_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.templating import _TemplateResponse
from typing import Final
from backend.config.settings import settings
from backend.database.db_connection import engine
from backend.routes.api_routes import router as api_router
# from src.routes.frontend_routes import router as frontend_router


_routers: Final[list[APIRouter]] = [
    api_router,
    # frontend_router,
]


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

templates: Jinja2Templates = Jinja2Templates(directory="templates")

for r in _routers: app.include_router(r)


@app.exception_handler(StarletteHTTPException)
async def general_http_exception_handler(request: Request, exception: StarletteHTTPException) -> Response | _TemplateResponse:
    if request.url.path.startswith("/api"):
        return await http_exception_handler(request, exception)

    msg: str = (
        exception.detail
        if exception.detail
        else "An error occurred. Please check your request and try again."
    )

    return templates.TemplateResponse(
        request,
        "error.html",  # TODO: replace with react error page
        {
            "status_code": exception.status_code,
            "title": exception.status_code,
            "message": msg
        },
        status_code=exception.status_code
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exception: RequestValidationError) -> Response | _TemplateResponse:
    if request.url.path.startswith("/api"):
        return await request_validation_exception_handler(request, exception)

    return templates.TemplateResponse(
        request,
        "error.html",  # TODO: replace with react error page
        {
            "status_code": status.HTTP_422_UNPROCESSABLE_CONTENT,
            "title": status.HTTP_422_UNPROCESSABLE_CONTENT,
            "message": "Invalid request. Please check your input and try again."
        },
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT
    )
