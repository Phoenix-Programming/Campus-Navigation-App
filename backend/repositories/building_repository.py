from geoalchemy2 import WKBElement
from geoalchemy2.shape import from_shape
from shapely.geometry import Polygon
from sqlalchemy import Result, delete, func, select
from sqlalchemy.orm import selectinload
from backend.exceptions import (
    BuildingCodeNotFoundError, BuildingNotFoundError, FloorNumberNotFoundError,
    BuildingCategoryNotFoundError, NodeTypeNotFoundError
)
from backend.schema.building import Building
from backend.schema.building_category import BuildingCategory
from backend.schema.floor import Floor
from backend.schema.indoor_edge import IndoorEdge
from backend.schema.indoor_node import IndoorNode
from backend.schema.node_type import NodeType
from backend.utilities.db_connection import Database
from .interfaces.building_repository_interface import BuildingRepositoryInterface


class BuildingRepository(BuildingRepositoryInterface):
    def __init__(self, db: Database):
        self.db = db


    async def get_all_buildings(self) -> list[Building]:
        buildings_result: Result[Building] = await self.db.execute(
            select(Building).options(selectinload(Building.building_category))
        )

        return list(buildings_result.scalars().all())


    async def get_building_id_by_building_code(self, bld_code: str) -> int:
        buildings_result: Result[Building] = await self.db.execute(
            select(Building)
            .where(Building.code == bld_code)
        )

        bld: Building | None = buildings_result.scalars().one_or_none()

        if not bld: raise BuildingCodeNotFoundError()

        return bld.id


    async def get_floor_id(self, bld_id: int, floor_num: int) -> int:
        floors_result: Result[Floor] = await self.db.execute(
            select(Floor)
            .where(Floor.building_id == bld_id, Floor.floor_num == floor_num))

        floor: Floor | None = floors_result.scalars().one_or_none()

        if not floor: raise FloorNumberNotFoundError(bld_id)

        return floor.id


    async def get_indoor_svg_for_bld_floor(self, floor_id: int) -> str:
        floors_result: Result[Floor] = await self.db.execute(
            select(Floor)
            .where(Floor.id == floor_id)
        )

        floor: Floor | None = floors_result.scalars().one_or_none()

        if not floor: raise FloorNumberNotFoundError(floor_id)

        return floor.svg


    async def get_all_indoor_nodes_for_bld_floor(
        self,
        bld_id: int,
        floor_id: int
    ) -> list[IndoorNode]:
        nodes_result: Result[IndoorNode] = await self.db.execute(
            select(IndoorNode)
            .options(selectinload(IndoorNode.node_type))
            .where(IndoorNode.building_id == bld_id, IndoorNode.floor_id == floor_id)
        )

        return list(nodes_result.scalars().all())


    async def get_all_indoor_edges_for_bld_floor(
        self,
        bld_id: int,
        floor_id: int
    ) -> list[IndoorEdge]:
        edges_result: Result[IndoorEdge] = await self.db.execute(select(IndoorEdge).where(
            IndoorEdge.building_id == bld_id, IndoorEdge.floor_id == floor_id
        ))

        return list(edges_result.scalars().all())


    async def insert_indoor_nodes(
        self,
        bld_id: int,
        floor_id: int,
        nodes_coords: list[tuple[float, float]],
        clickable_areas: list[WKBElement | None],
        nodes_labels: list[str | None],
        node_types_ids: list[int],
        current_user_id: int
    ) -> list[int]:
        nodes: list[IndoorNode] = [
            IndoorNode(
                building_id=bld_id,
                floor_id=floor_id,
                node_type_id=node_type_id,
                label=label,
                x=x,
                y=y,
                clickable_area=clickable_area,
                last_updated_by=current_user_id
            )
            for (x, y), clickable_area, label, node_type_id in zip(
                nodes_coords,
                clickable_areas,
                nodes_labels,
                node_types_ids
            )
        ]

        self.db.add_all(nodes)

        try:
            await self.db.flush()

            inserted_node_ids: list[int] = [node.id for node in nodes]
            await self.db.commit()
            return inserted_node_ids
        except:
            await self.db.rollback()
            raise


    async def insert_indoor_edges(
        self,
        bld_id: int,
        floor_id: int,
        source_nodes_ids: list[int],
        target_nodes_ids: list[int],
        current_user_id: int
    ) -> None:
        edges: list[IndoorEdge] = [
            IndoorEdge(
                building_id=bld_id,
                floor_id=floor_id,
                source_node_id=source,
                target_node_id=target,
                last_updated_by=current_user_id
            )
            for source, target in zip(source_nodes_ids, target_nodes_ids)
        ]

        self.db.add_all(edges)

        try:
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def delete_all_indoor_nodes_for_bld_floor(self, bld_id: int, floor_id: int) -> None:
        await self.db.execute(
            delete(IndoorNode)
            .where(IndoorNode.building_id == bld_id, IndoorNode.floor_id == floor_id)
        )

        try:
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def delete_all_indoor_edges_for_bld_floor(self, bld_id: int, floor_id: int) -> None:
        await self.db.execute(
            delete(IndoorEdge)
            .where(IndoorEdge.building_id == bld_id, IndoorEdge.floor_id == floor_id)
        )

        try:
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def get_building_category_id_by_category_type(self, category_type: str) -> int:
        result: Result[int] = await self.db.execute(
            select(BuildingCategory.id)
            .where(func.lower(BuildingCategory.category) == category_type.lower())
        )

        category_id: int | None = result.scalar_one_or_none()

        if not category_id: raise BuildingCategoryNotFoundError(category_type=category_type)

        return category_id


    async def insert_building(
        self,
        name: str,
        code: str,
        address: str,
        category_id: int,
        num_floors: int,
        floor_svgs: list[str],
        current_user_id: int
    ) -> None:
        building: Building = Building(
            name=name,
            code=code,
            address=address,
            category_id=category_id,
            num_floors=num_floors,
            last_updated_by=current_user_id
        )

        self.db.add(building)

        await self.db.flush()

        for floor_num, svg in enumerate(floor_svgs, start=1):
            floor: Floor = Floor(
                building_id=building.id,
                floor_num=floor_num,
                svg=svg,
                last_updated_by=current_user_id
            )
            self.db.add(floor)

        try:
            await self.db.commit()
        except:
            await self.db.rollback()
            raise

    async def get_all_building_categories(self) -> list[BuildingCategory]:
        categories_result: Result[BuildingCategory] = await self.db.execute(
            select(BuildingCategory)
        )

        return list(categories_result.scalars().all())

    async def get_building_by_id(self, bld_id: int) -> Building:
        buildings_result: Result[Building] = await self.db.execute(
            select(Building)
            .options(
                selectinload(Building.building_category),
                selectinload(Building.floors)
            )
            .where(Building.id == bld_id)
        )

        bld: Building | None = buildings_result.scalars().one_or_none()

        if not bld: raise BuildingNotFoundError(bld_id=bld_id)

        return bld

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
    ) -> None:
        building: Building = await self.get_building_by_id(bld_id=bld_id)
        original_num_floors: int = building.num_floors

        if name: building.name = name
        if code: building.code = code
        if address: building.address = address
        if category_id: building.category_id = category_id
        if num_floors:
            building.num_floors = num_floors

            # Remove floors if the number of floors has decreased
            if num_floors < len(building.floors):
                await self.db.execute(
                    delete(Floor).where(Floor.building_id == bld_id, Floor.floor_num > num_floors)
                )

            # Add new floors if the number of floors has increased
            for floor_num in range(original_num_floors + 1, num_floors + 1):
                new_floor: Floor = Floor(
                    building_id=building.id,
                    floor_num=floor_num,
                    svg=floor_svgs[floor_num - 1] if floor_svgs and floor_svgs[floor_num - 1] else "",
                    last_updated_by=current_user_id
                )

                self.db.add(new_floor)

        # Update floor SVGs if provided, but only for existing floors
        if floor_svgs:
            for floor_num, svg in enumerate(floor_svgs, start=1):
                if floor_num > original_num_floors: break
                if not svg: continue

                floors_result: Result[Floor] = await self.db.execute(
                    select(Floor)
                    .where(Floor.building_id == bld_id, Floor.floor_num == floor_num)
                )

                floor: Floor | None = floors_result.scalar_one_or_none()

                if not floor: raise FloorNumberNotFoundError(bld_id=bld_id)

                floor.svg = svg
                floor.last_updated_by = current_user_id

        building.last_updated_by = current_user_id

        try:
            await self.db.commit()
        except:
            await self.db.rollback()
            raise


    async def get_all_node_types(self) -> list[NodeType]:
        node_types_result: Result[NodeType] = await self.db.execute(select(NodeType))

        return list(node_types_result.scalars().all())


    async def get_node_type_id_by_type(self, node_type: str) -> int:
        result: Result[int] = await self.db.execute(
            select(NodeType.id)
            .where(func.lower(NodeType.type) == node_type.lower())
        )

        node_type_id: int | None = result.scalar_one_or_none()

        if not node_type_id: raise NodeTypeNotFoundError(node_type=node_type)

        return node_type_id
