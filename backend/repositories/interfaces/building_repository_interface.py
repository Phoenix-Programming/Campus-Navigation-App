from abc import ABC, abstractmethod
from geoalchemy2 import WKBElement
from backend.schema.building import Building
from backend.schema.building_category import BuildingCategory
from backend.schema.indoor_edge import IndoorEdge
from backend.schema.indoor_node import IndoorNode
from backend.schema.node_type import NodeType


class BuildingRepositoryInterface(ABC):
    @abstractmethod
    async def get_all_buildings(self) -> list[Building]: pass

    @abstractmethod
    async def get_building_id_by_building_code(self, bld_code: str) -> int: pass

    @abstractmethod
    async def get_floor_id(self, bld_id: int, floor_num: int) -> int: pass

    @abstractmethod
    async def get_indoor_svg_for_bld_floor(self, floor_id: int) -> str: pass

    @abstractmethod
    async def get_all_indoor_nodes_for_bld_floor(
        self,
        bld_id: int,
        floor_id: int
    ) -> list[IndoorNode]:
        pass

    @abstractmethod
    async def get_all_indoor_edges_for_bld_floor(
        self,
        bld_id: int,
        floor_id: int
    ) -> list[IndoorEdge]:
        pass

    @abstractmethod
    async def insert_indoor_nodes(
        self,
        bld_id: int,
        floor_id: int,
        nodes_coords: list[tuple[float, float]],
        clickable_areas: list[WKBElement | None],
        nodes_labels: list[str | None],
        node_types_ids: list[int],
        current_user_id: int
    ) -> list[int]: pass

    @abstractmethod
    async def insert_indoor_edges(
        self,
        bld_id: int,
        floor_id: int,
        source_nodes_ids: list[int],
        target_nodes_ids: list[int],
        current_user_id: int
    ) -> None: pass

    @abstractmethod
    async def delete_all_indoor_nodes_for_bld_floor(self, bld_id: int, floor_id: int) -> None: pass

    @abstractmethod
    async def delete_all_indoor_edges_for_bld_floor(self, bld_id: int, floor_id: int) -> None: pass

    @abstractmethod
    async def get_building_category_id_by_category_type(self, category_type: str) -> int: pass

    @abstractmethod
    async def insert_building(
        self,
        name: str,
        code: str,
        address: str,
        category_id: int,
        num_floors: int,
        floor_svgs: list[str],
        current_user_id: int
    ) -> None: pass

    @abstractmethod
    async def get_all_building_categories(self) -> list[BuildingCategory]: pass

    @abstractmethod
    async def get_building_by_id(self, bld_id: int) -> Building: pass

    @abstractmethod
    async def update_building(
        self,
        bld_id: int,
        name: str | None,
        code: str | None,
        address: str | None,
        category_id: int | None,
        num_floors: int | None,
        floor_svgs: list[str | None] | None,
        current_user_id: int
    ) -> None: pass

    @abstractmethod
    async def get_all_node_types(self) -> list[NodeType]: pass

    @abstractmethod
    async def get_node_type_id_by_type(self, node_type: str) -> int: pass
