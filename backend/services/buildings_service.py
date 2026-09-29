from backend.auth.current_user_context import CurrentUserContext
from backend.exceptions import NotAuthorizedToEditIndoorMapError
from backend.models.buildings import BuildingModel, GetAllBuildingsResponse, GetIndoorMapResponse, IndoorEdgeModel, IndoorNodeModel, UpdateIndoorMapGraphRequest
from backend.repositories.building_repository import BuildingRepository
from backend.schema.building import Building
from backend.schema.indoor_node import IndoorNode
from backend.schema.indoor_edge import IndoorEdge
from backend.schema.permissions import Permission
from backend.utilities.db_connection import Database


class BuildingsService:
	def __init__(self) -> None:
		self.repo: BuildingRepository = BuildingRepository()

	async def get_all_buildings(self, db: Database) -> GetAllBuildingsResponse:
		buildings: list[Building] = await self.repo.get_all_buildings(db=db)

		response: GetAllBuildingsResponse = GetAllBuildingsResponse(buildings=[
      		BuildingModel(id=bld.id, name=bld.name, code=bld.code, num_floors=bld.num_floors)
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
		if current_user.user.role not in ["admin", "editor"]: raise NotAuthorizedToEditIndoorMapError()

		bld_id: int = await self.repo.get_building_id_by_building_code(bld_code=bld_code, db=db)
		floor_id: int = await self.repo.get_floor_id(bld_id=bld_id, floor_num=floor_num, db=db)

		# TODO: Replace deleting all nodes/edges with updating existing nodes/edges, inserting new nodes/edges, and deleting removed nodes/edges
		await self.repo.delete_all_indoor_edges(db=db)
		await self.repo.delete_all_indoor_nodes(db=db)

		await self.repo.insert_indoor_nodes(
			bld_id=bld_id,
			floor_id=floor_id,
			nodes_coords=[(node.x, node.y) for node in nodes],
			nodes_labels=[node.label for node in nodes],
			db=db
		)

		await self.repo.insert_indoor_edges(
			bld_id=bld_id,
			floor_id=floor_id,
			source_nodes_ids=[edge.source_node_id for edge in edges],
			target_nodes_ids=[edge.target_node_id for edge in edges],
			db=db
		)
