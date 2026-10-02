from pydantic import BaseModel, Field


class GetAllBuildingsResponse(BaseModel):
	buildings: list[BuildingModel]


class BuildingModel(BaseModel):
	id: int
	name: str = Field(max_length=128)
	code: str = Field(max_length=10)
	num_floors: int


class GetIndoorMapResponse(BaseModel):
    svg: str
    nodes: list[IndoorNodeModel]
    edges: list[IndoorEdgeModel]


class UpdateIndoorMapGraphRequest(BaseModel):
    bld_code: str
    floor_num: int
    nodes: list[IndoorNodeModel]
    edges: list[IndoorEdgeModel]


class CreateBuildingRequest(BaseModel):
    name: str = Field(max_length=128)
    code: str = Field(max_length=10)
    address: str = Field(max_length=256)
    category_type: str = Field(max_length=64)
    num_floors: int
    floor_svgs: list[str]


class IndoorNodeModel(BaseModel):
    id: int
    label: str | None = Field(max_length=64)
    x: float
    y: float


class IndoorEdgeModel(BaseModel):
    id: int
    source_node_id: int
    target_node_id: int
