from backend.auth.current_user_context import CurrentUserContext
from backend.exceptions import NotAuthorizedToEditIndoorMapError
from backend.models.buildings import BuildingModel, GetAllBuildingsResponse, GetBuildingResponse, GetIndoorMapResponse, IndoorEdgeModel, IndoorNodeModel, UpdateIndoorMapGraphRequest
from backend.repositories.building_repository import BuildingRepository
from backend.schema.building import Building
from backend.schema.building_category import BuildingCategory
from backend.schema.indoor_node import IndoorNode
from backend.schema.indoor_edge import IndoorEdge
from backend.schema.permissions import Permission
from backend.utilities.db_connection import Database


class BuildingsService:
	def __init__(self) -> None:
		self.repo: BuildingRepository = BuildingRepository()


	async def get_building_by_id(self, bld_id: int, db: Database) -> GetBuildingResponse:
		bld: Building = await self.repo.get_building_by_id(bld_id=bld_id, db=db)

		response: GetBuildingResponse = GetBuildingResponse(
			id=bld.id,
			name=bld.name,
			code=bld.code,
			address=bld.address,
			category_type=bld.building_category.category,
			num_floors=bld.num_floors,
			floor_svgs=[floor.svg for floor in bld.floors]
		)

		return response


	async def get_all_buildings(self, db: Database) -> GetAllBuildingsResponse:
		buildings: list[Building] = await self.repo.get_all_buildings(db=db)

		response: GetAllBuildingsResponse = GetAllBuildingsResponse(buildings=[
			BuildingModel(
				id=bld.id,
				name=bld.name,
				code=bld.code,
				address=bld.address,
				category_type=bld.building_category.category,
				num_floors=bld.num_floors
			)
        	for bld in buildings
        ])

		return response


	async def getIndoorMap(self, bld_code: str, floor_num: int, db: Database) -> GetIndoorMapResponse:
		bld_id: int = await self.repo.get_building_id_by_building_code(bld_code=bld_code, db=db)
		floor_id: int = await self.repo.get_floor_id(bld_id=bld_id, floor_num=floor_num, db=db)

		svg: str = await self.repo.get_indoor_svg_for_bld_floor(floor_id=floor_id, db=db)
		indoor_nodes: list[IndoorNode] = await self.repo.get_all_indoor_nodes_for_bld_floor(bld_id=bld_id, floor_id=floor_id, db=db)
		indoor_edges: list[IndoorEdge] = await self.repo.get_all_indoor_edges_for_bld_floor(bld_id=bld_id, floor_id=floor_id, db=db)

		response: GetIndoorMapResponse = GetIndoorMapResponse(
			svg=svg,
			nodes=[IndoorNodeModel(id=node.id, label=node.label, x=node.x, y=node.y) for node in indoor_nodes],
			edges=[
				IndoorEdgeModel(id=edge.id, source_node_id=edge.source_node_id, target_node_id=edge.target_node_id)
				for edge in indoor_edges
			]
		)

		return response


	async def updateIndoorMap(
		self,
		bld_code: str,
		floor_num: int,
		nodes: list[IndoorNodeModel],
		edges: list[IndoorEdgeModel],
		current_user: CurrentUserContext,
		db: Database
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		bld_id: int = await self.repo.get_building_id_by_building_code(bld_code=bld_code, db=db)
		floor_id: int = await self.repo.get_floor_id(bld_id=bld_id, floor_num=floor_num, db=db)

		await self.repo.delete_all_indoor_edges_for_bld_floor(bld_id=bld_id, floor_id=floor_id, db=db)
		await self.repo.delete_all_indoor_nodes_for_bld_floor(bld_id=bld_id, floor_id=floor_id, db=db)

		inserted_node_ids: list[int] = await self.repo.insert_indoor_nodes(
			bld_id=bld_id,
			floor_id=floor_id,
			nodes_coords=[(node.x, node.y) for node in nodes],
			nodes_labels=[node.label for node in nodes],
			db=db
		)

		node_id_map: dict[int, int] = {node.id: inserted_id for node, inserted_id in zip(nodes, inserted_node_ids)}

		try:
			source_node_ids: list[int] = [node_id_map[edge.source_node_id] for edge in edges]
			target_node_ids: list[int] = [node_id_map[edge.target_node_id] for edge in edges]
		except KeyError as error:
			raise ValueError("Indoor map edges must reference nodes present in the uploaded graph.") from error

		await self.repo.insert_indoor_edges(
			bld_id=bld_id,
			floor_id=floor_id,
			source_nodes_ids=source_node_ids,
			target_nodes_ids=target_node_ids,
			db=db
		)


	async def createBuilding(
		self,
		name: str,
		code: str,
		address: str,
		category_type: str,
		num_floors: int,
		floor_svgs: list[str | None] | None,
		current_user: CurrentUserContext,
		db: Database
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		if not floor_svgs: floor_svgs = ["" for _ in range(num_floors)]

		if len(floor_svgs) != num_floors:
			raise ValueError("Number of floor SVGs must match the number of floors")

		category_id: int = await self.repo.get_building_category_id_by_category_type(
      		category_type=category_type,
        	db=db
        )

		await self.repo.insert_building(
			name=name,
			code=code,
			address=address,
			category_id=category_id,
			num_floors=num_floors,
			floor_svgs=[svg if svg is not None else "" for svg in floor_svgs],
			current_user_id=current_user.user.id,
			db=db
		)


	async def get_all_building_categories(self, db: Database) -> list[str]:
		categories: list[BuildingCategory] = await self.repo.get_all_building_categories(db=db)

		return [category.category for category in categories]


	async def update_building(
		self,
		bld_id: int,
		name: str | None,
		code: str | None,
		address: str | None,
		category_type: str | None,
		num_floors: int | None,
		floor_svgs: list[str | None] | None,
		current_user: CurrentUserContext,
		db: Database
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		if not (name or code or address or category_type or num_floors or floor_svgs):
			raise ValueError("At least one field must be provided for update")

		bld: Building = await self.repo.get_building_by_id(bld_id=bld_id, db=db)
		target_num_floors: int = num_floors if num_floors is not None else bld.num_floors

		if floor_svgs:
			if len(floor_svgs) != target_num_floors:
				raise ValueError("Number of floor SVGs must match the number of floors")


		category_id: int | None = (
  			await self.repo.get_building_category_id_by_category_type(
				category_type=category_type,
				db=db
			)
			if category_type else None
		)

		await self.repo.update_building(
			bld_id=bld_id,
			name=name,
			code=code,
			address=address,
			category_id=category_id,
			num_floors=num_floors,
			floor_svgs=floor_svgs,
			current_user_id=current_user.user.id,
			db=db
		)
