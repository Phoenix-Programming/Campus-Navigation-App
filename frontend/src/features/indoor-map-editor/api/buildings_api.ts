import type {
	Building,
	BuildingData,
	CreateBuildingRequest,
	GetBuildingsResponse,
	GetIndoorMapResponse,
	IndoorMapData,
	UpdateBuildingRequest,
	UpdateIndoorMapRequest
} from "../models/buildings_models";
import api from "@shared/api/api";
import { showError, showSuccess } from "@features/notifications/services/notifications";
import type { AxiosResponse } from "axios";
import type { Node, Edge } from "../models/buildings_models";

export async function getBuildings(): Promise<Building[]> {
	try {
		const response: AxiosResponse<GetBuildingsResponse> = await api.get("/api/buildings");

		return response.data.buildings;
	} catch (error) {
		console.error("Error fetching buildings:", error);
		showError(
			error instanceof Error ? error.message : "The building list could not be loaded.",
			"Failed to Load Building List"
		);
		return [];
	}
}

export async function getIndoorMapData(bldCode: string, floorNum: number): Promise<IndoorMapData | null> {
	try {
		const response: AxiosResponse<GetIndoorMapResponse> = await api.get("/api/buildings/map", {
			params: {
				bld_code: bldCode,
				floor_num: floorNum
			}
		});

		return response.data;
	} catch (error) {
		console.error("Error fetching indoor map data:", error);
		showError(
			error instanceof Error ? error.message : "The indoor map could not be loaded.",
			"Failed to Load Indoor Map"
		);
		return null;
	}
}

export async function updateIndoorMap(
	bld_code: string,
	floor_num: number,
	nodes: Node[],
	edges: Edge[]
): Promise<void> {
	try {
		const request: UpdateIndoorMapRequest = {
			bld_code: bld_code,
			floor_num: floor_num,
			nodes: nodes,
			edges: edges
		};

		await api.post("/api/buildings/map", request);

		showSuccess("Indoor map saved successfully.", "Successfully Saved Indoor Map");
	} catch (error) {
		console.error("Error saving changes to the database:", error);
		showError(
			error instanceof Error ? error.message : "The indoor map could not be saved. Please try again.",
			"Failed to Save Indoor Map"
		);
	}
}

export async function getBuildingCategoryTypes(): Promise<string[] | null> {
	try {
		const response: AxiosResponse<string[]> = await api.get<string[]>("/api/buildings/categories");
		return response.data;
	} catch (error) {
		console.error("Error fetching building category types:", error);
		showError(
			error instanceof Error
				? error.message
				: "Unable to load building categories. Please close this window and try again.",
			"Failed to Load Building Categories"
		);
		return null;
	}
}

export async function getBuildingData(bld_id: number): Promise<BuildingData | null> {
	try {
		const response: AxiosResponse<BuildingData> = await api.get<BuildingData>(`/api/buildings/${bld_id}`);
		return response.data;
	} catch (error) {
		console.error("Error fetching building data:", error);
		showError(
			error instanceof Error ? error.message : "Unable to load the building details.",
			"Failed to Load Building Details"
		);
		return null;
	}
}

export async function updateBuilding(
	bld_id: number,
	buildingCategoryType: string,
	buildingName: string,
	buildingCode: string,
	buildingAddress: string,
	numFloors: number,
	svgs: (string | null)[] | null
): Promise<void> {
	try {
		const request: UpdateBuildingRequest = {
			category_type: buildingCategoryType,
			name: buildingName,
			code: buildingCode,
			address: buildingAddress,
			num_floors: numFloors,
			floor_svgs: svgs
		};

		await api.patch(`/api/buildings/${bld_id}`, request);
	} catch (error) {
		console.error("Error saving building changes:", error);
		showError(
			error instanceof Error ? error.message : "The building could not be updated. Please try again.",
			"Failed to Save Building Changes"
		);
	}
}

export async function createBuilding(
	categoryType: string,
	name: string,
	code: string,
	address: string,
	numFloors: number,
	svgs: (string | null)[] | null
): Promise<void> {
	try {
		const request: CreateBuildingRequest = {
			category_type: categoryType,
			name: name,
			code: code,
			address: address,
			num_floors: numFloors,
			floor_svgs: svgs
		};

		await api.post("/api/buildings", request);
	} catch (error) {
		console.error("Error creating building:", error);
		showError(
			error instanceof Error ? error.message : "The building could not be created. Please try again.",
			"Failed to Create Building"
		);
	}
}
