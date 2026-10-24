from geoalchemy2 import WKBElement
from geoalchemy2.shape import from_shape
from shapely import Polygon
from backend.auth.current_user_context import CurrentUserContext
from backend.exceptions import NotAuthorizedToEditIndoorMapError
from backend.models.buildings import (
    BuildingModel, GetAllBuildingsResponse, GetBuildingResponse, GetIndoorMapResponse,
    IncomingIndoorEdgeModel, IndoorEdgeModel, IndoorNodeModel
)
from backend.repositories.interfaces.building_repository_interface import BuildingRepositoryInterface
from backend.schema.building import Building
from backend.schema.building_category import BuildingCategory
from backend.schema.indoor_node import IndoorNode
from backend.schema.indoor_edge import IndoorEdge


class BuildingsService:
	def __init__(self, bld_repo: BuildingRepositoryInterface) -> None:
		self.bld_repo: BuildingRepositoryInterface = bld_repo


	async def get_building_by_id(self, bld_id: int) -> GetBuildingResponse:
		bld: Building = await self.bld_repo.get_building_by_id(bld_id=bld_id)

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


	async def get_all_buildings(self) -> GetAllBuildingsResponse:
		buildings: list[Building] = await self.bld_repo.get_all_buildings()

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


	async def getIndoorMap(self, bld_code: str, floor_num: int) -> GetIndoorMapResponse:
		bld_id: int = await self.bld_repo.get_building_id_by_building_code(bld_code=bld_code)
		floor_id: int = await self.bld_repo.get_floor_id(bld_id=bld_id, floor_num=floor_num)

		svg: str = await self.bld_repo.get_indoor_svg_for_bld_floor(floor_id=floor_id)
		indoor_nodes: list[IndoorNode] = await self.bld_repo.get_all_indoor_nodes_for_bld_floor(bld_id=bld_id, floor_id=floor_id)
		indoor_edges: list[IndoorEdge] = await self.bld_repo.get_all_indoor_edges_for_bld_floor(bld_id=bld_id, floor_id=floor_id)

		response: GetIndoorMapResponse = GetIndoorMapResponse(
			svg=svg,
			nodes=[
       			IndoorNodeModel(id=node.id, type=node.node_type.type, label=node.label, x=node.x, y=node.y)
          		for node in indoor_nodes
            ],
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
		edges: list[IncomingIndoorEdgeModel],
		current_user: CurrentUserContext
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		bld_id: int = await self.bld_repo.get_building_id_by_building_code(bld_code=bld_code)
		floor_id: int = await self.bld_repo.get_floor_id(bld_id=bld_id, floor_num=floor_num)

		await self.bld_repo.delete_all_indoor_edges_for_bld_floor(bld_id=bld_id, floor_id=floor_id)
		await self.bld_repo.delete_all_indoor_nodes_for_bld_floor(bld_id=bld_id, floor_id=floor_id)

		node_type_ids: list[int] = [await self.bld_repo.get_node_type_id_by_type(node_type=node.type) for node in nodes]

		clickable_areas: list[WKBElement | None] = [
			from_shape(Polygon([(point.x, point.y) for point in node.clickable_area]), srid=0)
			if node.clickable_area else None
            for node in nodes
        ]

		inserted_node_ids: list[int] = await self.bld_repo.insert_indoor_nodes(
			bld_id=bld_id,
			floor_id=floor_id,
			node_types_ids=node_type_ids,
			nodes_coords=[(node.x, node.y) for node in nodes],
			clickable_areas=clickable_areas,
			nodes_labels=[node.label for node in nodes],
			current_user_id=current_user.user.id,
		)

		node_id_map: dict[int, int] = {node.id: inserted_id for node, inserted_id in zip(nodes, inserted_node_ids)}

		try:
			source_node_ids: list[int] = [node_id_map[edge.source_node_id] for edge in edges]
			target_node_ids: list[int] = [node_id_map[edge.target_node_id] for edge in edges]
		except KeyError:
			raise ValueError("Indoor map edges must reference nodes present in the uploaded graph.")

		await self.bld_repo.insert_indoor_edges(
			bld_id=bld_id,
			floor_id=floor_id,
			source_nodes_ids=source_node_ids,
			target_nodes_ids=target_node_ids,
			current_user_id=current_user.user.id,

		)


	async def createBuilding(
		self,
		name: str,
		code: str,
		address: str,
		category_type: str,
		num_floors: int,
		floor_svgs: list[str | None] | None,
		current_user: CurrentUserContext
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		if not floor_svgs: floor_svgs = ["" for _ in range(num_floors)]

		if len(floor_svgs) != num_floors:
			raise ValueError("Number of floor SVGs must match the number of floors")

		category_id: int = await self.bld_repo.get_building_category_id_by_category_type(
      		category_type=category_type,

        )

		await self.bld_repo.insert_building(
			name=name,
			code=code,
			address=address,
			category_id=category_id,
			num_floors=num_floors,
			floor_svgs=[svg if svg is not None else "" for svg in floor_svgs],
			current_user_id=current_user.user.id,

		)


	async def get_all_building_categories(self) -> list[str]:
		categories: list[BuildingCategory] = await self.bld_repo.get_all_building_categories()

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
		current_user: CurrentUserContext
	) -> None:
		# TODO: Replace with permission check instead of role check???
		if current_user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		if not (name or code or address or category_type or num_floors or floor_svgs):
			raise ValueError("At least one field must be provided for update")

		bld: Building = await self.bld_repo.get_building_by_id(bld_id=bld_id)
		target_num_floors: int = num_floors if num_floors is not None else bld.num_floors

		if floor_svgs:
			if len(floor_svgs) != target_num_floors:
				raise ValueError("Number of floor SVGs must match the number of floors")


		category_id: int | None = (
  			await self.bld_repo.get_building_category_id_by_category_type(
				category_type=category_type,

			)
			if category_type else None
		)

		await self.bld_repo.update_building(
			bld_id=bld_id,
			name=name,
			code=code,
			address=address,
			category_id=category_id,
			num_floors=num_floors,
			floor_svgs=floor_svgs,
			current_user_id=current_user.user.id,

		)
