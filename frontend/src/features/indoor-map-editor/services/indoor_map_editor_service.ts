import type { Building, BuildingData, IndoorMapData } from "../models/buildings_models";
import {
	getBuildings as getBuildingsApi,
	getIndoorMapData as getIndoorMapDataApi,
	updateIndoorMap as updateIndoorMapApi,
	getBuildingCategoryTypes as getBuildingCategoryTypesApi,
	getBuildingData as getBuildingDataApi,
	updateBuilding as updateBuildingApi,
	createBuilding as createBuildingApi
} from "../api/buildings_api";
import type { Node } from "../models/buildings_models";
import type { Edge } from "../models/buildings_models";

export async function getBuildings(): Promise<Building[]> {
	return (await getBuildingsApi()) ?? [];
}

export async function getIndoorMapData(bldCode: string, floorNum: number): Promise<IndoorMapData> {
	return (await getIndoorMapDataApi(bldCode, floorNum)) ?? { svg: "", nodes: [], edges: [] };
}

export async function updateIndoorMap(
	bld_code: string,
	floor_num: number,
	nodes: Node[],
	edges: Edge[]
): Promise<void> {
	await updateIndoorMapApi(bld_code, floor_num, nodes, edges);
}

export async function getBuildingCategoryTypes(): Promise<string[]> {
	return (await getBuildingCategoryTypesApi()) ?? [];
}

export async function getBuildingData(bld_id: number): Promise<BuildingData> {
	return (
		(await getBuildingDataApi(bld_id)) ?? {
			category_type: "",
			name: "",
			code: "",
			address: "",
			num_floors: 0,
			floor_svgs: []
		}
	);
}

export async function updateBuilding(
	bld_id: number,
	categoryType: string,
	name: string,
	code: string,
	address: string,
	numFloors: number,
	svgs: (string | null)[] | null
): Promise<void> {
	await updateBuildingApi(bld_id, categoryType, name, code, address, numFloors, svgs);
}

export async function createBuilding(
	categoryType: string,
	name: string,
	code: string,
	address: string,
	numFloors: number,
	svgs: (string | null)[] | null
) {
	await createBuildingApi(categoryType, name, code, address, numFloors, svgs);
}
