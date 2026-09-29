from fastapi import APIRouter, HTTPException, status
from backend.auth.auth import AdminUser
from backend.exceptions import BuildingCodeNotFoundError, FloorNumberNotFoundError
from backend.models.buildings import GetAllBuildingsResponse, GetIndoorMapResponse, UpdateIndoorMapGraphRequest
from backend.services.buildings_service import BuildingsService
from backend.utilities.db_connection import Database


router: APIRouter = APIRouter(
	prefix="/buildings",
	tags=["Buildings"]
)

service: BuildingsService = BuildingsService()

@router.get(path="", response_model=GetAllBuildingsResponse)
async def get_all_buildings(
	db: Database
) -> GetAllBuildingsResponse:
	try:
		return await service.get_all_buildings(db=db)
	except (BuildingCodeNotFoundError, FloorNumberNotFoundError) as e:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get(path="/map", response_model=GetIndoorMapResponse)
async def get_indoor_map(
    bld_code: str,
    floor_num: int,
    db: Database
) -> GetIndoorMapResponse:
    try:
        return await service.getIndoorMap(bld_code=bld_code, floor_num=floor_num, db=db)
    except (BuildingCodeNotFoundError, FloorNumberNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.post(path="/map")
async def update_indoor_map(
	request: UpdateIndoorMapGraphRequest,
	current_user: AdminUser,
	db: Database
) -> None:
    try:
        await service.updateIndoorMap(
            bld_code=request.bld_code,
            floor_num=request.floor_num,
            nodes=request.nodes,
            edges=request.edges,
            current_user=current_user,
            db=db
        )
    except (BuildingCodeNotFoundError, FloorNumberNotFoundError) as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
