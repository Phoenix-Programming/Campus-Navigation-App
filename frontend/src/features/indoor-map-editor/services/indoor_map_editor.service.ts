import type { Building, BuildingData, IndoorMapData } from "../models/buildings_models";
import {
	getBuildings as getBuildingsApi,
	getIndoorMapData as getIndoorMapDataApi,
	updateIndoorMap as updateIndoorMapApi,
	getBuildingCategoryTypes as getBuildingCategoryTypesApi,
	getBuildingData as getBuildingDataApi,
	updateBuilding as updateBuildingApi,
	createBuilding as createBuildingApi
} from "../api/buildings.api";
import type { Node, Edge } from "../models/buildings_models";
import type { IndoorMapGraphUploadPayload, StagedIndoorMapGraphData } from "../models/indoor_map_editor_models";

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseFiniteNumber(value: unknown, fieldName: string): number {
	const numericValue: number = typeof value === "number" ? value : Number(value);

	if (!Number.isFinite(numericValue)) throw new Error(`Each ${fieldName} value must be a valid number.`);

	return numericValue;
}

export function normalizeFloorSvgData(
	floorSvgData: string[] | { [floorNumber: number]: string },
	totalFloors: number
): { [floorNumber: number]: string } {
	const normalizedFloorSvgs: { [floorNumber: number]: string } = {};

	if (Array.isArray(floorSvgData)) {
		for (let floorNumber = 1; floorNumber <= totalFloors; floorNumber++) {
			const svg: string | undefined = floorSvgData[floorNumber - 1];

			if (!svg || svg.trim() === "") continue;

			normalizedFloorSvgs[floorNumber] = svg;
		}

		return normalizedFloorSvgs;
	}

	for (let floorNumber = 1; floorNumber <= totalFloors; floorNumber++) {
		const oneBasedSvg: string | undefined = floorSvgData[floorNumber];
		const zeroBasedSvg: string | undefined = floorSvgData[floorNumber - 1];
		const resolvedSvg: string | undefined =
			typeof oneBasedSvg === "string" ? oneBasedSvg : typeof zeroBasedSvg === "string" ? zeroBasedSvg : undefined;

		if (!resolvedSvg || resolvedSvg.trim() === "") continue;

		normalizedFloorSvgs[floorNumber] = resolvedSvg;
	}

	return normalizedFloorSvgs;
}

export function getFloorSvgForFloor(floorSvgData: { [floorNumber: number]: string }, floorNumber: number): string {
	const svgForFloor: string | undefined = floorSvgData[floorNumber];

	return typeof svgForFloor === "string" ? svgForFloor : "";
}

export function buildFloorSvgUpdatePayload(
	initialFloorSvgs: { [floorNumber: number]: string },
	currentFloorSvgs: { [floorNumber: number]: string },
	originalNumFloors: number,
	numFloors: number
): (string | null)[] | null {
	const svgPayload: (string | null)[] = Array.from({ length: numFloors }, () => null);
	let hasSvgChanges: boolean = false;

	for (let floorNumber = 1; floorNumber <= numFloors; floorNumber++) {
		const currentSvg: string = getFloorSvgForFloor(currentFloorSvgs, floorNumber).trim();
		const initialSvg: string =
			floorNumber <= originalNumFloors ? getFloorSvgForFloor(initialFloorSvgs, floorNumber).trim() : "";

		if (currentSvg === initialSvg) continue;

		hasSvgChanges = true;
		svgPayload[floorNumber - 1] = currentSvg === "" ? null : currentSvg;
	}

	return hasSvgChanges ? svgPayload : null;
}

export function buildFloorSvgCreatePayload(
	currentFloorSvgs: { [floorNumber: number]: string },
	numFloors: number
): (string | null)[] | null {
	const svgPayload: (string | null)[] = Array.from({ length: numFloors }, () => null);
	let hasUploadedSvg: boolean = false;

	for (let floorNumber = 1; floorNumber <= numFloors; floorNumber++) {
		const svg: string = getFloorSvgForFloor(currentFloorSvgs, floorNumber).trim();

		if (svg === "") continue;

		hasUploadedSvg = true;
		svgPayload[floorNumber - 1] = svg;
	}

	return hasUploadedSvg ? svgPayload : null;
}

export function sanitizeBuildingCodeForFileName(code: string): string {
	const trimmedCode: string = code.trim();

	if (trimmedCode === "") return "unknown";

	return trimmedCode.replace(/[^a-zA-Z0-9-_]/g, "-");
}

export function getMapReloadTargetFloor(
	selectedFloor: number | null,
	updatedSelectedBuilding: Building | null
): number | null {
	if (selectedFloor === null || updatedSelectedBuilding === null) return null;
	if (selectedFloor < 1 || selectedFloor > updatedSelectedBuilding.num_floors) return null;

	return selectedFloor;
}

export async function getLiveGraphFloors(targetBuildingCode: string, totalFloors: number): Promise<Set<number>> {
	const nextLiveGraphFloors: Set<number> = new Set();
	const floorRequests: Promise<{ floorNumber: number; hasGraphData: boolean }>[] = Array.from(
		{ length: totalFloors },
		(_, index) => index + 1
	).map(async (floorNumber) => {
		const data: IndoorMapData = await getIndoorMapData(targetBuildingCode, floorNumber);

		return {
			floorNumber,
			hasGraphData: data.nodes.length > 0 || data.edges.length > 0
		};
	});

	const floorResults = await Promise.all(floorRequests);

	for (const result of floorResults) {
		if (result.hasGraphData) nextLiveGraphFloors.add(result.floorNumber);
	}

	return nextLiveGraphFloors;
}

export function normalizeUploadedGraphPayload(
	rawPayload: unknown,
	floorNumber: number,
	targetBuildingCode: string
): StagedIndoorMapGraphData {
	if (!isRecord(rawPayload))
		throw new Error("The selected file must contain a JSON object with nodes and edges arrays.");

	const graphRoot: Record<string, unknown> = isRecord(rawPayload.graph) ? rawPayload.graph : rawPayload;
	const fileBuildingCode: unknown = graphRoot.bld_code;
	const fileFloorNumber: unknown = graphRoot.floor_num;

	if (
		typeof fileBuildingCode === "string" &&
		targetBuildingCode !== "" &&
		fileBuildingCode.trim() !== "" &&
		fileBuildingCode.trim() !== targetBuildingCode
	) {
		throw new Error(
			`This graph file is for building ${fileBuildingCode.trim()}, but the selected building is ${targetBuildingCode}.`
		);
	}

	if (fileFloorNumber !== undefined && parseFiniteNumber(fileFloorNumber, "floor number") !== floorNumber) {
		throw new Error(
			`This graph file is for floor ${String(fileFloorNumber)}, but floor ${floorNumber} is currently selected.`
		);
	}

	const rawNodes: unknown = graphRoot.nodes;
	const rawEdges: unknown = graphRoot.edges;

	if (!Array.isArray(rawNodes)) throw new Error("The selected file must include a nodes array.");

	if (!Array.isArray(rawEdges)) throw new Error("The selected file must include an edges array.");

	const nodeIdMap: Map<string, number> = new Map();
	const nodes: Node[] = rawNodes.map((rawNode, index) => {
		if (!isRecord(rawNode)) throw new Error("Each node in the selected file must be an object.");

		const sourceNodeId: unknown = rawNode.id ?? index + 1;

		if (typeof sourceNodeId !== "string" && typeof sourceNodeId !== "number")
			throw new Error("Each node must include an id value.");

		const sourceNodeKey: string = String(sourceNodeId);

		if (nodeIdMap.has(sourceNodeKey)) throw new Error("Duplicate node ids were found in the selected graph file.");

		const normalizedNodeId: number = index + 1;
		nodeIdMap.set(sourceNodeKey, normalizedNodeId);

		const rawLabel: unknown = rawNode.label ?? rawNode.name;

		return {
			id: normalizedNodeId,
			label: typeof rawLabel === "string" && rawLabel.trim() !== "" ? rawLabel : "",
			type: typeof rawNode.type === "string" && rawNode.type.trim() !== "" ? rawNode.type : "room",
			x: parseFiniteNumber(rawNode.x, "node x"),
			y: parseFiniteNumber(rawNode.y, "node y")
		};
	});

	const edges: Edge[] = rawEdges.map((rawEdge, index) => {
		if (!isRecord(rawEdge)) throw new Error("Each edge in the selected file must be an object.");

		const sourceNodeId: unknown = rawEdge.source_node_id ?? rawEdge.sourceNodeId;
		const targetNodeId: unknown = rawEdge.target_node_id ?? rawEdge.targetNodeId;

		if (
			(typeof sourceNodeId !== "string" && typeof sourceNodeId !== "number") ||
			(typeof targetNodeId !== "string" && typeof targetNodeId !== "number")
		) {
			throw new Error("Each edge must include source and target node ids.");
		}

		const normalizedSourceNodeId: number | undefined = nodeIdMap.get(String(sourceNodeId));
		const normalizedTargetNodeId: number | undefined = nodeIdMap.get(String(targetNodeId));

		if (normalizedSourceNodeId === undefined || normalizedTargetNodeId === undefined)
			throw new Error("Each edge must reference node ids that exist in the uploaded nodes array.");

		return {
			id: String(index + 1),
			source_node_id: normalizedSourceNodeId,
			target_node_id: normalizedTargetNodeId
		};
	});

	return { nodes, edges };
}

export function buildIndoorMapGraphDownloadPayload(
	targetBuildingCode: string,
	floorNumber: number,
	data: IndoorMapData
): IndoorMapGraphUploadPayload {
	return {
		bld_code: targetBuildingCode,
		floor_num: floorNumber,
		nodes: data.nodes,
		edges: data.edges
	};
}

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
