from fastapi import APIRouter, Request
from starlette.templating import _TemplateResponse
from backend.main import templates


router: APIRouter = APIRouter(prefix="/")


@router.get("", include_in_schema=False)
def home(request: Request) -> _TemplateResponse:
    return templates.TemplateResponse(request, "home.html")  # TODO: update to use React


@router.get("/login", include_in_schema=False)
async def login_page(request: Request) -> _TemplateResponse:
    return templates.TemplateResponse(
		request,
		"login.html",  # TODO: update to use React
		{"title": "Login"}
	)


@router.get("/register", include_in_schema=False)
async def register_page(request: Request) -> _TemplateResponse:
    return templates.TemplateResponse(
		request,
		"register.html",  # TODO: update to use React
		{"title": "Register"}
	)


@router.get("/account", include_in_schema=False)
async def account_page(request: Request) -> _TemplateResponse:
    return templates.TemplateResponse(
		request,
		"account.html",  # TODO: update to use React
		{"title": "Account"}
	)


@router.get("/forgot-password", include_in_schema=False)
async def forgot_passowrd_page(request: Request):
	return templates.TemplateResponse(
		request,
		"forgot_password.html",  # TODO: update to use React
		{"title": "Forgot Password"}
	)


@router.get("/reset-password", include_in_schema=False)
async def reset_passowrd_page(request: Request):
	response = templates.TemplateResponse(
		request,
		"reset_password.html",  # TODO: update to use React
		{"title": "Reset Password"}
	)
	response.headers["Referrer-Policy"] = "no-referrer"
	return response
