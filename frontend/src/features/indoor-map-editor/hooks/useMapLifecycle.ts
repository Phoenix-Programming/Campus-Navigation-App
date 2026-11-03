import { useCallback, useEffect, useState } from "react";
import { type Building, type Edge, type IndoorMapData, type Node } from "../models/buildings_models";
import {
	getBuildings as getBuildingsService,
	getIndoorMapData as getIndoorMapDataService,
	getMapReloadTargetFloor,
	updateIndoorMap as updateIndoorMapService
} from "../services/indoor_map_editor.service";

export function useMapLifecycle() {
	const [buildings, setBuildings] = useState<Building[]>([]);
	const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
	const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [svg, setSvg] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Node[] | null>(null);
	const [edges, setEdges] = useState<Edge[] | null>(null);

	useEffect(() => {
		if (svg !== null && nodes !== null && edges !== null) setMapLoaded(true);
		else setMapLoaded(false);
	}, [svg, nodes, edges]);

	const clearMapData = useCallback(() => {
		setSvg(null);
		setNodes(null);
		setEdges(null);
		setMapLoaded(false);
	}, []);

	const getBuildings = useCallback(async (): Promise<Building[]> => {
		const nextBuildings = await getBuildingsService();
		setBuildings(nextBuildings);
		return nextBuildings;
	}, []);

	const getIndoorMapData = useCallback(async (bldCode: string, floor: number): Promise<void> => {
		const data: IndoorMapData = await getIndoorMapDataService(bldCode, floor);
		setSvg(data.svg);
		setNodes(data.nodes);
		setEdges(data.edges);
	}, []);

	const loadMapData = useCallback(
		async (bldCode: string, floor: number): Promise<void> => {
			clearMapData();
			await getIndoorMapData(bldCode, floor);
		},
		[clearMapData, getIndoorMapData]
	);

	const refreshBuildings = useCallback(
		async (buildingId?: number): Promise<void> => {
			const refreshedBuildings = await getBuildings();
			if (selectedBuilding === null) return;

			const updatedSelectedBuilding: Building | null =
				refreshedBuildings.find((building) => building.id === (buildingId ?? selectedBuilding.id)) ?? null;

			if (updatedSelectedBuilding === null) {
				setSelectedBuilding(null);
				setSelectedFloor(null);
				clearMapData();
				return;
			}

			setSelectedBuilding(updatedSelectedBuilding);
			const floorToReload: number | null = getMapReloadTargetFloor(selectedFloor, updatedSelectedBuilding);

			if (floorToReload !== null) {
				await loadMapData(updatedSelectedBuilding.code, floorToReload);
				return;
			}

			if (selectedFloor === null) return;
			setSelectedFloor(null);
			clearMapData();
		},
		[clearMapData, getBuildings, loadMapData, selectedBuilding, selectedFloor]
	);

	const onSelectedBuildingChange = useCallback(
		async (bld: Building): Promise<void> => {
			setSelectedFloor(null);
			setSelectedBuilding(bld);
			clearMapData();
		},
		[clearMapData]
	);

	const onSelectedFloorChange = useCallback(
		async (floor: number): Promise<void> => {
			setSelectedFloor(floor);
			if (selectedBuilding) await loadMapData(selectedBuilding.code, floor);
		},
		[loadMapData, selectedBuilding]
	);

	const postChangesToDatabase = useCallback(async (): Promise<void> => {
		if (!selectedBuilding || selectedFloor === null || !nodes || !edges) return;
		await updateIndoorMapService(selectedBuilding.code, selectedFloor, nodes, edges);
	}, [edges, nodes, selectedBuilding, selectedFloor]);

	return {
		buildings,
		setBuildings,
		selectedBuilding,
		setSelectedBuilding,
		selectedFloor,
		setSelectedFloor,
		mapLoaded,
		setMapLoaded,
		svg,
		setSvg,
		nodes,
		setNodes,
		edges,
		setEdges,
		getBuildings,
		getIndoorMapData,
		loadMapData,
		clearMapData,
		refreshBuildings,
		onSelectedBuildingChange,
		onSelectedFloorChange,
		postChangesToDatabase
	};
}
