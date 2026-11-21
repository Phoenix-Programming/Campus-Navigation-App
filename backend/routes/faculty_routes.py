from fastapi import APIRouter


router: APIRouter = APIRouter(
	prefix="/faculty",
	tags=["Faculty"]
)
