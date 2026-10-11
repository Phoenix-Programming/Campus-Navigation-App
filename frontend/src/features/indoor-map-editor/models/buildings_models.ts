export interface GetBuildingsResponse {
	buildings: Building[];
}

export interface GetIndoorMapResponse {
	svg: string;
	nodes: Node[];
	edges: Edge[];
}

export interface UpdateIndoorMapRequest {
	bld_code: string;
	floor_num: number;
	nodes: Node[];
	edges: Edge[];
}

export interface UpdateBuildingRequest {
	category_type: string;
	name: string;
	code: string;
	address: string;
	num_floors: number;
	floor_svgs: (string | null)[] | null;
}

export interface CreateBuildingRequest extends UpdateBuildingRequest {}

export interface Building {
	id: number;
	name: string;
	code: string;
	num_floors: number;
}

export interface IndoorMapData {
	svg: string;
	nodes: Node[];
	edges: Edge[];
}

export interface BuildingData {
	category_type: string;
	name: string;
	code: string;
	address: string;
	num_floors: number;
	floor_svgs: string[] | { [floorNumber: number]: string };
}

export interface Node {
	id: number;
	label: string;
	type: string;
	x: number;
	y: number;
}

export interface Edge {
	id: string;
	source_node_id: number;
	target_node_id: number;
}

export enum NodeType {
	room = "room",
	roomDoor = "room-door",
	hallway = "hallway",
	staircase = "staircase",
	elevator = "elevator"
}
