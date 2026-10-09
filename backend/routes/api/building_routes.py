from fastapi import APIRouter, HTTPException, status
from backend.auth.auth import AdminUser
from backend.exceptions import NotFoundError
from backend.models.buildings import (
    CreateBuildingRequest,
    GetAllBuildingsResponse,
    GetBuildingResponse,
    GetIndoorMapResponse,
    UpdateBuildingRequest,
    UpdateIndoorMapGraphRequest
)
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
	except NotFoundError as e:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(path="/map", response_model=GetIndoorMapResponse)
async def get_indoor_map(
    bld_code: str,
    floor_num: int,
    db: Database
) -> GetIndoorMapResponse:
    try:
        return await service.getIndoorMap(bld_code=bld_code, floor_num=floor_num, db=db)
    except NotFoundError as e:
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
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(path="")
async def create_building(
    request: CreateBuildingRequest,
    current_user: AdminUser,
    db: Database
) -> None:
    try:
        await service.createBuilding(
            name=request.name,
            code=request.code,
            address=request.address,
            category_type=request.category_type,
            num_floors=request.num_floors,
            floor_svgs=request.floor_svgs,
            current_user=current_user,
            db=db
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get(path="/categories", response_model=list[str])
async def get_all_building_categories(
    db: Database
) -> list[str]:
    try:
        return await service.get_all_building_categories(db=db)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get(path="/{bld_id}", response_model=GetBuildingResponse)
async def get_building(
    bld_id: int,
    db: Database
) -> GetBuildingResponse:
    try:
        return await service.get_building_by_id(bld_id=bld_id, db=db)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.patch("/{bld_id}")
async def update_building(
    request: UpdateBuildingRequest,
    bld_id: int,
    current_user: AdminUser,
    db: Database
) -> None:
    try:
        await service.update_building(
            bld_id=bld_id,
            name=request.name,
            code=request.code,
            address=request.address,
            category_type=request.category_type,
            num_floors=request.num_floors,
            floor_svgs=request.floor_svgs,
            current_user=current_user,
            db=db
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        print(f"ValueError in update_building: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
