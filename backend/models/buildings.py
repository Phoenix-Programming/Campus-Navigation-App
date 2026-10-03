from pydantic import BaseModel, Field


class GetAllBuildingsResponse(BaseModel):
    buildings: list["BuildingModel"] = Field(default_factory=list)


class BuildingModel(BaseModel):
    id: int
    name: str = Field(min_length=1, max_length=128)
    code: str = Field(min_length=1, max_length=10)
    address: str = Field(min_length=1, max_length=256)
    category_type: str = Field(min_length=1, max_length=24)
    num_floors: int = Field(gt=0)


class GetBuildingResponse(BuildingModel):
    floor_svgs: list[str] = Field(default_factory=list)

class GetIndoorMapResponse(BaseModel):
    svg: str
    nodes: list[IndoorNodeModel]
    edges: list[IndoorEdgeModel]


class UpdateIndoorMapGraphRequest(BaseModel):
    bld_code: str = Field(max_length=10)
    floor_num: int = Field(gt=0)
    nodes: list[IndoorNodeModel]
    edges: list[IndoorEdgeModel]


class CreateBuildingRequest(BaseModel):
    name: str = Field(min_length=1, max_length=128)
    code: str = Field(min_length=1, max_length=10)
    address: str = Field(min_length=1, max_length=256)
    category_type: str = Field(min_length=1, max_length=24)
    num_floors: int = Field(gt=0)
    floor_svgs: list[str | None] | None = Field(default=None)


class UpdateBuildingRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=128)
    code: str | None = Field(default=None, min_length=1, max_length=10)
    address: str | None = Field(default=None, min_length=1, max_length=256)
    category_type: str | None = Field(default=None, min_length=1, max_length=24)
    num_floors: int | None = Field(default=None, gt=0)
    floor_svgs: list[str | None] | None = Field(default=None)


class IndoorNodeModel(BaseModel):
    id: int
    label: str | None = Field(default=None, max_length=64)
    x: float
    y: float


class IndoorEdgeModel(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
