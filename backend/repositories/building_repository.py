from sqlalchemy import Result, select, text
from backend.exceptions import BuildingCodeNotFoundError, FloorNumberNotFoundError, BuildingCategoryNotFoundError
from backend.schema.building import Building
from backend.schema.building_category import BuildingCategory
from backend.schema.floor import Floor
from backend.schema.indoor_edge import IndoorEdge
from backend.schema.indoor_node import IndoorNode
from backend.utilities.db_connection import Database


class BuildingRepository:
    async def get_all_buildings(self, db: Database) -> list[Building]:
        buildings_result: Result[tuple[Building]] = await db.execute(select(Building))

        return list(buildings_result.scalars().all())


    async def get_building_id_by_building_code(self, bld_code: str, db: Database) -> int:
        buildings_result: Result[tuple[Building]] = await db.execute(
            select(Building)
            .where(Building.code == bld_code)
        )

        bld: Building | None = buildings_result.scalars().one_or_none()

        if not bld: raise BuildingCodeNotFoundError()

        return bld.id


    async def get_floor_id(self, bld_id: int, floor_num: int, db: Database) -> int:
        floors_result: Result[tuple[Floor]] = await db.execute(
            select(Floor)
            .where(Floor.building_id == bld_id, Floor.floor_num == floor_num))

        floor: Floor | None = floors_result.scalars().one_or_none()

        if not floor: raise FloorNumberNotFoundError(bld_id)

        return floor.id


    async def get_indoor_svg_for_bld_floor(self, floor_id: int, db: Database) -> str:
        floors_result: Result[tuple[Floor]] = await db.execute(
            select(Floor)
            .where(Floor.id == floor_id)
        )

        floor: Floor | None = floors_result.scalars().one_or_none()

        if not floor: raise FloorNumberNotFoundError(floor_id)

        return floor.svg


    async def get_all_indoor_nodes_for_bld_floor(self, bld_id: int, floor_id: int, db: Database) -> list[IndoorNode]:
        nodes_result: Result[tuple[IndoorNode]] = await db.execute(select(IndoorNode).where(
            IndoorNode.building_id == bld_id, IndoorNode.floor_id == floor_id
        ))

        return list(nodes_result.scalars().all())


    async def get_all_indoor_edges_for_bld_floor(self, bld_id: int, floor_id: int, db: Database) -> list[IndoorEdge]:
        edges_result: Result[tuple[IndoorEdge]] = await db.execute(select(IndoorEdge).where(
            IndoorEdge.building_id == bld_id, IndoorEdge.floor_id == floor_id
        ))

        return list(edges_result.scalars().all())


    async def insert_indoor_nodes(
        self,
        bld_id: int,
        floor_id: int,
        nodes_coords: list[tuple[float, float]],
        nodes_labels: list[str | None],
        db: Database
    ) -> None:
        nodes: list[IndoorNode] = [
            IndoorNode(building_id=bld_id, floor_id=floor_id, label=label, x=x, y=y)
            for (x, y), label in zip(nodes_coords, nodes_labels)
        ]

        db.add_all(nodes)

        try:
            await db.commit()
        except:
            await db.rollback()
            raise


    async def insert_indoor_edges(
        self,
        bld_id: int,
        floor_id: int,
        source_nodes_ids: list[int],
        target_nodes_ids: list[int],
        db: Database
    ) -> None:
        edges: list[IndoorEdge] = [
            IndoorEdge(building_id=bld_id, floor_id=floor_id, source_node_id=source, target_node_id=target)
            for source, target in zip(source_nodes_ids, target_nodes_ids)
        ]

        db.add_all(edges)

        try:
            await db.commit()
        except:
            await db.rollback()
            raise


    async def delete_all_indoor_nodes(self, db: Database) -> None:
        try:
            await db.execute(text("TRUNCATE TABLE indoor_nodes"))
            await db.commit()
        except:
            await db.rollback()
            raise


    async def delete_all_indoor_edges(self, db: Database) -> None:
        try:
            await db.execute(text("TRUNCATE TABLE indoor_edges"))
            await db.commit()
        except:
            await db.rollback()
            raise


    async def get_building_category_id_by_category_type(self, category_type: str, db: Database) -> int:
        result: Result[tuple[int]] = await db.execute(
            select(BuildingCategory.id)
            .where(BuildingCategory.category == category_type)
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
        current_user_id: int,
        db: Database
    ) -> None:
        building: Building = Building(
            name=name,
            code=code,
            address=address,
            category_id=category_id,
            num_floors=num_floors,
            last_updated_by=current_user_id
        )

        db.add(building)

        await db.flush()

        for floor_num, svg in enumerate(floor_svgs, start=1):
            floor: Floor = Floor(
                building_id=building.id,
                floor_num=floor_num,
                svg=svg
            )
            db.add(floor)

        try:
            await db.commit()
        except:
            await db.rollback()
            raise
