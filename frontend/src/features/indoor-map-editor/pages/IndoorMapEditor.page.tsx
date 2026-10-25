import React, { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import DragSelect from "dragselect";
import { NodeType, type Node, type Edge, type Building, type IndoorMapData } from "../models/buildings_models";
import { ClickableAreaTool, Tool, type DragSelectionMode } from "../models/indoor_map_editor_models";
import { type SvgMapCoordinates, type SvgViewerHandle } from "../models/svg_viewer_models";
import {
	getBuildings as getBuildingsService,
	getIndoorMapData as getIndoorMapDataService,
	getMapReloadTargetFloor,
	updateIndoorMap as updateIndoorMapService
} from "../services/indoor_map_editor.service";
import { buildClickableAreaPoints, canFinalizeClickableArea } from "../utils/clickable_area";
import ConfirmationModal from "@shared/components/ConfirmationModal";
import EdgeComponent, { isEdge } from "../components/EdgeComponent";
import BuildingModal from "../components/BuildingModal";
import ClickableAreaToolbar from "../components/ClickableAreaToolbar";
import IndoorGraphContextComponent from "../components/IndoorGraphContextComponent";
import IndoorMapEditorToolbar from "../components/IndoorMapEditorToolbar";
import NodeComponent, { isNode } from "../components/NodeComponent";
import SvgViewerComponent from "../components/SvgViewerComponent";
import { showWarning } from "@features/notifications/services/notifications.service";
import circleIcon from "@assets/icons/circle.svg";
import lineIcon from "@assets/icons/remove.svg";
import addIcon from "@assets/icons/add.svg";
import editIcon from "@assets/icons/edit.svg";
import saveIcon from "@assets/icons/save.svg";
import "../styles/indoor-map-editor.scss";
import "@shared/styles/main.scss";

export default function IndoorMapEditor(): React.JSX.Element {
	const svgViewerZoomStep: number = 0.1;
	const isMacOS: boolean = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
	const primaryModifierLabel: string = isMacOS ? "⌘" : "⌃";
	const key = [
		{ icon: circleIcon, label: "Room", className: "room" },
		{ icon: circleIcon, label: "Room Door", className: "room-door" },
		{ icon: circleIcon, label: "Hallway", className: "hallway" },
		{ icon: circleIcon, label: "Staircase", className: "stairs" },
		{ icon: circleIcon, label: "Elevator", className: "elevator" },
		{ icon: circleIcon, label: "Entrance/Exit", className: "entrance-exit" },
		{ icon: circleIcon, label: "Water Fountain", className: "water-fountain" },
		{ icon: circleIcon, label: "Vending", className: "vending" },
		{ icon: lineIcon, label: "Connection", className: "connection" }
	];

	const svgViewerRef = useRef<SvgViewerHandle>(null);
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const dragSelectRef = useRef<DragSelect | null>(null);
	const dragSelectBaselineRef = useRef<{ nodeIds: Set<number>; edgeIds: Set<string> } | null>(null);
	const nodesRef = useRef<Node[] | null>(null);
	const edgesRef = useRef<Edge[] | null>(null);
	const selectedNodeRef = useRef<Node | null>(null);
	const selectedEdgeRef = useRef<Edge | null>(null);
	const selectedNodesAndEdgesRef = useRef<Set<Node | Edge>>(new Set<Node | Edge>());
	const isShiftPressedRef = useRef<boolean>(false);
	const isPrimaryModifierPressedRef = useRef<boolean>(false);
	const dragSelectionModeRef = useRef<DragSelectionMode>("select");
	const isDragSelectingRef = useRef<boolean>(false);
	const globalSelectionLockRef = useRef<boolean>(false);
	const globalSelectionStyleBackupRef = useRef<
		Array<{
			element: HTMLElement;
			userSelect: string;
			webkitUserSelect: string;
		}>
	>([]);

	const [buildings, setBuildings] = useState<Building[]>([]);
	const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
	const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [svg, setSvg] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Node[] | null>(null);
	const [edges, setEdges] = useState<Edge[] | null>(null);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
	const [selectedNodesAndEdges, setSelectedNodesAndEdges] = useState<Set<Node | Edge>>(new Set<Node | Edge>());
	const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
	const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);
	const [selectedTool, setSelectedTool] = useState<Tool>(Tool.SingleSelect);
	const [changesMade, setChangesMade] = useState(false);
	const [showEditBuildingModal, setShowEditBuildingModal] = useState(false);
	const [showCreateBuildingModal, setShowCreateBuildingModal] = useState(false);
	const [savePending, setSavePending] = useState(false);
	const [discardPending, setDiscardPending] = useState(false);
	const [nodeTypeToCreate, setNodeTypeToCreate] = useState<string>("room");
	const [isShiftPressed, setIsShiftPressed] = useState(false);
	const [isPrimaryModifierPressed, setIsPrimaryModifierPressed] = useState(false);
	const [isDragSelecting, setIsDragSelecting] = useState(false);
	const [clickableAreaEditingNodeId, setClickableAreaEditingNodeId] = useState<number | null>(null);
	const [selectedClickableAreaTool, setSelectedClickableAreaTool] = useState<ClickableAreaTool>(
		ClickableAreaTool.SelectNode
	);
	const [clickableAreaDraftPoints, setClickableAreaDraftPoints] = useState<SvgMapCoordinates[]>([]);
	const [clickableAreaCursorPosition, setClickableAreaCursorPosition] = useState<SvgMapCoordinates | null>(null);
	const draggedClickableAreaPointRef = useRef<{ nodeId: number; pointIndex: number } | null>(null);

	const svgDimensions = useMemo<{ width: number; height: number }>(() => {
		const widthMatch: RegExpMatchArray | null = svg?.match(/width\s*=\s*["']([^"']+)["']/i) ?? null;
		const heightMatch: RegExpMatchArray | null = svg?.match(/height\s*=\s*["']([^"']+)["']/i) ?? null;
		const viewBoxMatch: RegExpMatchArray | null = svg?.match(/viewBox\s*=\s*["']([^"']+)["']/i) ?? null;

		if (widthMatch && heightMatch) {
			const width: number = Number.parseFloat(widthMatch[1]);
			const height: number = Number.parseFloat(heightMatch[1]);

			if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return { width, height };
		}

		if (viewBoxMatch) {
			const parts: number[] = viewBoxMatch[1]
				.trim()
				.split(/[\s,]+/)
				.map(Number);

			if (parts.length >= 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3]) && parts[2] > 0 && parts[3] > 0) {
				return { width: parts[2], height: parts[3] };
			}
		}

		return { width: 100, height: 100 };
	}, [svg]);

	function getNodeTypeHexColor(nodeType: string): string {
		switch (nodeType) {
			case NodeType.room:
				return "#262aff";
			case NodeType.hallway:
				return "#21ff37";
			case NodeType.roomDoor:
				return "#ff2626";
			case NodeType.staircase:
				return "#ffa500";
			case NodeType.elevator:
				return "#ffff00";
			case NodeType.entranceExit:
				return "#543b2b";
			case NodeType.waterFountain:
				return "#00ffff";
			case NodeType.vending:
				return "#03690a";
			default:
				return "#262aff";
		}
	}

	function toRgba(hex: string, alpha: number): string {
		const normalizedHex: string = hex.replace("#", "");
		const value: string =
			normalizedHex.length === 3
				? normalizedHex
						.split("")
						.map((char) => char + char)
						.join("")
				: normalizedHex;
		const intValue: number = Number.parseInt(value, 16);

		const red: number = (intValue >> 16) & 255;
		const green: number = (intValue >> 8) & 255;
		const blue: number = intValue & 255;

		return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
	}

	useEffect(() => {
		getBuildings();
	}, []);

	useEffect(() => {
		if (svg !== null && nodes !== null && edges != null) setMapLoaded(true);
		else setMapLoaded(false);
	}, [svg, nodes, edges]);

	useEffect(() => {
		nodesRef.current = nodes;
	}, [nodes]);

	useEffect(() => {
		edgesRef.current = edges;
	}, [edges]);

	useEffect(() => {
		selectedNodeRef.current = selectedNode;
	}, [selectedNode]);

	useEffect(() => {
		selectedEdgeRef.current = selectedEdge;
	}, [selectedEdge]);

	useEffect(() => {
		selectedNodesAndEdgesRef.current = selectedNodesAndEdges;
	}, [selectedNodesAndEdges]);

	useEffect(() => {
		isShiftPressedRef.current = isShiftPressed;
	}, [isShiftPressed]);

	useEffect(() => {
		isPrimaryModifierPressedRef.current = isPrimaryModifierPressed;
	}, [isPrimaryModifierPressed]);

	useEffect(() => {
		isDragSelectingRef.current = isDragSelecting;
	}, [isDragSelecting]);

	useEffect(() => {
		if (selectedTool !== Tool.EditClickableArea) return;
		if (selectedClickableAreaTool === ClickableAreaTool.SelectNode) return;
		if (selectedNode !== null) return;

		setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
		draggedClickableAreaPointRef.current = null;
	}, [selectedTool, selectedClickableAreaTool, selectedNode]);

	function restoreSelectionFromBaseline(): void {
		const baseline = dragSelectBaselineRef.current;
		if (!baseline) return;

		const nextSelection: Set<Node | Edge> = new Set();
		const nextNodes: Node[] = nodesRef.current ?? [];
		const nextEdges: Edge[] = edgesRef.current ?? [];

		for (const node of nextNodes) if (baseline.nodeIds.has(node.id)) nextSelection.add(node);

		for (const edge of nextEdges) if (baseline.edgeIds.has(edge.id)) nextSelection.add(edge);

		setSelectedNode(null);
		setSelectedEdge(null);
		setSelectedNodesAndEdges(nextSelection);
	}

	function cancelActiveDragSelection(): void {
		if (!isDragSelectingRef.current) return;

		restoreSelectionFromBaseline();
		safeStopDragSelect(dragSelectRef.current);
		dragSelectRef.current = null;
		dragSelectBaselineRef.current = null;
		setIsDragSelecting(false);
	}

	function lockGlobalTextSelection(): void {
		if (globalSelectionLockRef.current) return;

		const targetElements: HTMLElement[] = [
			document.documentElement,
			document.body,
			document.getElementById("root")
		].filter((element): element is HTMLElement => element instanceof HTMLElement);

		globalSelectionStyleBackupRef.current = targetElements.map((element) => ({
			element,
			userSelect: element.style.userSelect,
			webkitUserSelect: element.style.webkitUserSelect
		}));

		for (const element of targetElements) {
			element.style.userSelect = "none";
			element.style.webkitUserSelect = "none";
		}

		globalSelectionLockRef.current = true;
	}

	function unlockGlobalTextSelection(): void {
		if (!globalSelectionLockRef.current) return;

		for (const { element, userSelect, webkitUserSelect } of globalSelectionStyleBackupRef.current) {
			element.style.userSelect = userSelect;
			element.style.webkitUserSelect = webkitUserSelect;
		}

		globalSelectionStyleBackupRef.current = [];
		globalSelectionLockRef.current = false;
	}

	function safeStopDragSelect(instance: DragSelect | null): void {
		if (!instance) return;

		try {
			instance.stop();
		} catch {
			// DragSelect can already be torn down if cancellation and cleanup overlap.
		}
	}

	useEffect(() => {
		lockGlobalTextSelection();

		return () => {
			unlockGlobalTextSelection();
		};
	}, []);

	useEffect(() => {
		const updateModifierState = (event: KeyboardEvent): void => {
			setIsShiftPressed(event.shiftKey);
			setIsPrimaryModifierPressed(isMacOS ? event.metaKey : event.ctrlKey);
		};

		const maybeCancelDragSelectionForModifierRelease = (event: KeyboardEvent): void => {
			if (!isDragSelectingRef.current) return;

			const shiftPressed: boolean = event.shiftKey;
			const primaryModifierPressed: boolean = isMacOS ? event.metaKey : event.ctrlKey;
			const dragMode: DragSelectionMode = dragSelectionModeRef.current;

			if (!shiftPressed || (dragMode === "deselect" && !primaryModifierPressed)) {
				cancelActiveDragSelection();
			}
		};

		const onKeyDown = (event: KeyboardEvent): void => {
			updateModifierState(event);
			maybeCancelDragSelectionForModifierRelease(event);
		};

		const onKeyUp = (event: KeyboardEvent): void => {
			updateModifierState(event);
			maybeCancelDragSelectionForModifierRelease(event);
		};

		const onBlur = (): void => {
			setIsShiftPressed(false);
			setIsPrimaryModifierPressed(false);
			cancelActiveDragSelection();
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		window.addEventListener("blur", onBlur);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
			window.removeEventListener("blur", onBlur);
		};
	}, [isMacOS]);

	useEffect(() => {
		if (!mapLoaded || selectedTool !== Tool.MultiSelect || !isShiftPressed) {
			if (isDragSelectingRef.current) restoreSelectionFromBaseline();
			safeStopDragSelect(dragSelectRef.current);
			dragSelectRef.current = null;
			dragSelectBaselineRef.current = null;
			setIsDragSelecting(false);
			return;
		}

		const mapContainer = mapContainerRef.current;
		if (!mapContainer) return;

		const viewerElement: HTMLElement | null = mapContainer.querySelector(".viewer");
		const selectionArea: HTMLElement = viewerElement ?? mapContainer;

		const selectableElements: Array<HTMLElement | SVGElement> = Array.from(
			mapContainer.querySelectorAll<HTMLElement | SVGElement>("[data-ds-selectable='true']")
		);

		if (selectableElements.length === 0) return;

		const dragSelect = new DragSelect({
			area: selectionArea,
			selectables: selectableElements,
			draggability: false
		});

		dragSelectRef.current = dragSelect;

		const getSelectionIds = (): { nodeIds: Set<number>; edgeIds: Set<string> } => {
			const nodeIds: Set<number> = new Set();
			const edgeIds: Set<string> = new Set();

			if (selectedNodeRef.current) nodeIds.add(selectedNodeRef.current.id);
			if (selectedEdgeRef.current) edgeIds.add(selectedEdgeRef.current.id);

			for (const item of selectedNodesAndEdgesRef.current) {
				if (isNode(item)) nodeIds.add(item.id);
				if (isEdge(item)) edgeIds.add(item.id);
			}

			return { nodeIds, edgeIds };
		};

		const applyMergedSelection = (elements: Element[]): void => {
			const baseline: { nodeIds: Set<number>; edgeIds: Set<string> } =
				dragSelectBaselineRef.current ?? getSelectionIds();

			const draggedNodeIds: Set<number> = new Set();
			const draggedEdgeIds: Set<string> = new Set();

			for (const element of elements) {
				const selectableElement = element as HTMLElement;
				const selectableId: string | undefined = selectableElement.dataset.dsId;
				const selectableType: string | undefined = selectableElement.dataset.dsType;

				if (!selectableId || !selectableType) continue;

				if (selectableType === "node") draggedNodeIds.add(Number(selectableId));
				if (selectableType === "edge") draggedEdgeIds.add(selectableId);
			}

			const selectionMode: DragSelectionMode = dragSelectionModeRef.current;
			const nodeIds: Set<number> =
				selectionMode === "deselect"
					? new Set(Array.from(baseline.nodeIds).filter((id) => !draggedNodeIds.has(id)))
					: new Set([...baseline.nodeIds, ...draggedNodeIds]);

			const edgeIds: Set<string> =
				selectionMode === "deselect"
					? new Set(Array.from(baseline.edgeIds).filter((id) => !draggedEdgeIds.has(id)))
					: new Set([...baseline.edgeIds, ...draggedEdgeIds]);

			const nextSelection: Set<Node | Edge> = new Set();
			const nextNodes: Node[] = nodesRef.current ?? [];
			const nextEdges: Edge[] = edgesRef.current ?? [];

			for (const node of nextNodes) {
				if (nodeIds.has(node.id)) nextSelection.add(node);
			}

			for (const edge of nextEdges) {
				if (edgeIds.has(edge.id)) nextSelection.add(edge);
			}

			setSelectedNode(null);
			setSelectedEdge(null);
			setSelectedNodesAndEdges(nextSelection);
		};

		dragSelect.subscribe("DS:start", ({ event }) => {
			const commandOrCtrlPressedFromEvent: boolean =
				event && "metaKey" in event && "ctrlKey" in event
					? isMacOS
						? Boolean(event.metaKey)
						: Boolean(event.ctrlKey)
					: isPrimaryModifierPressedRef.current;

			dragSelectionModeRef.current = commandOrCtrlPressedFromEvent ? "deselect" : "select";
			dragSelectBaselineRef.current = getSelectionIds();
			setIsDragSelecting(true);
		});

		dragSelect.subscribe("DS:end", ({ items }) => {
			if (!isDragSelectingRef.current) return;

			applyMergedSelection(items as Element[]);
			dragSelectBaselineRef.current = null;
			setIsDragSelecting(false);
		});

		return () => {
			if (dragSelectRef.current === dragSelect) {
				safeStopDragSelect(dragSelect);
				dragSelectRef.current = null;
			}

			dragSelectBaselineRef.current = null;
			setIsDragSelecting(false);
		};
	}, [mapLoaded, selectedTool, nodes, edges, isShiftPressed, isPrimaryModifierPressed, isMacOS]);

	async function onSelectedBuildingChange(bld: Building): Promise<void> {
		setSelectedFloor(null);
		setSelectedBuilding(bld);
		clearMapData();
	}

	async function onSelectedFloorChange(floor: number): Promise<void> {
		setSelectedFloor(floor);
		await loadMapData(selectedBuilding!.code, floor);
	}

	async function loadMapData(bld_code: string, floor: number): Promise<void> {
		clearMapData();

		await getIndoorMapData(bld_code, floor);
	}

	function clearMapData(): void {
		setSvg(null);
		setNodes(null);
		setEdges(null);
		setSelectedNode(null);
		setSelectedEdge(null);
		setSelectedNodesAndEdges(new Set<Node | Edge>());
		setHoveredNode(null);
		setHoveredEdge(null);
		setMapLoaded(false);
	}

	async function getBuildings(): Promise<Building[]> {
		const nextBuildings: Building[] = await getBuildingsService();
		setBuildings(nextBuildings);
		return nextBuildings;
	}

	async function refreshBuildings(buildingId?: number): Promise<void> {
		const refreshedBuildings: Building[] = await getBuildings();

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
	}

	async function getIndoorMapData(bldCode: string, floor: number): Promise<void> {
		const data: IndoorMapData = await getIndoorMapDataService(bldCode, floor);

		setSvg(data.svg);
		setNodes(data.nodes);
		setEdges(data.edges);
	}

	function cancelClickableAreaEdit(): void {
		setClickableAreaDraftPoints([]);
		setClickableAreaCursorPosition(null);
	}

	function onSelectedToolChange(tool: Tool): void {
		if (tool === selectedTool) return;

		if (selectedTool === Tool.EditClickableArea) {
			cancelClickableAreaEdit();
			setClickableAreaEditingNodeId(null);
			setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
			draggedClickableAreaPointRef.current = null;
		}

		setSelectedTool(tool);

		switch (tool) {
			case Tool.SingleSelect:
				if (selectedNodesAndEdges.size === 1) {
					const firstItem: Node | Edge = Array.from(selectedNodesAndEdges)[0];
					if (isNode(firstItem)) setSelectedNode(firstItem);
					else if (isEdge(firstItem)) setSelectedEdge(firstItem);
				}

				setSelectedNodesAndEdges(new Set<Node | Edge>());
				break;
			case Tool.MultiSelect:
				if (selectedNode) setSelectedNodesAndEdges(new Set<Node | Edge>([selectedNode]));
				else if (selectedEdge) setSelectedNodesAndEdges(new Set<Node | Edge>([selectedEdge]));

				setSelectedNode(null);
				setSelectedEdge(null);
				break;
			case Tool.CreateNode:
				setSelectedNode(null);
				setSelectedEdge(null);
				setSelectedNodesAndEdges(new Set<Node | Edge>());
				break;
			case Tool.SingleConnect:
			case Tool.MultiConnect:
				if (selectedNodesAndEdges.size === 1) {
					const firstItem: Node | Edge = Array.from(selectedNodesAndEdges)[0];
					if (isNode(firstItem)) setSelectedNode(firstItem);
				}

				setSelectedEdge(null);
				setSelectedNodesAndEdges(new Set<Node | Edge>());
				break;
			case Tool.MoveNode:
				setSelectedNode(null);
				setSelectedEdge(null);
				setSelectedNodesAndEdges(new Set<Node | Edge>());
				break;
			case Tool.EditClickableArea:
				if (selectedNodesAndEdges.size === 1) {
					const firstItem: Node | Edge = Array.from(selectedNodesAndEdges)[0];
					if (isNode(firstItem)) setSelectedNode(firstItem);
				}

				setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);

				if (selectedNode) setClickableAreaEditingNodeId(selectedNode.id);

				setSelectedEdge(null);
				setSelectedNodesAndEdges(new Set<Node | Edge>());
				cancelClickableAreaEdit();
				break;
		}
	}

	function getToolHintText(): string | null {
		switch (selectedTool) {
			case Tool.SingleSelect:
				return `Click a node/edge to select${selectedNode || selectedEdge ? "/deselect" : ""} it`;
			case Tool.MultiSelect:
				return `Hold ⇧ and Drag to select${
					selectedNodesAndEdges.size > 0 ? ` | Hold ⇧ + ${primaryModifierLabel} and Drag to deselect` : ""
				}`;
			case Tool.SingleConnect:
				return "Click 2 nodes to create or break a connection";
			case Tool.MultiConnect:
				return selectedNode === null ? "Click a node to select it" : "Click other nodes to create connections";
			case Tool.MoveNode:
				return "Click and Drag a node to move it";
			case Tool.CreateNode:
				return "Click on the map to create a new node";
			case Tool.EditClickableArea:
				if (!selectedNode) return "Click a node to select it";

				if (selectedClickableAreaTool === ClickableAreaTool.MovePoints)
					return "Click and Drag a clickable area point to move it";

				if (selectedClickableAreaTool === ClickableAreaTool.AddPoint)
					return "Click between 2 existing clickable area points to add a new point";

				if (selectedClickableAreaTool === ClickableAreaTool.DeletePoint)
					return "Click a clickable area point to delete it";

				if (selectedNode.clickable_area?.length)
					return "Use Select, Move, Add Point, or Delete Point tools in the clickable area toolbar";

				const numDraftPoints: number = clickableAreaDraftPoints.length;

				return (
					(numDraftPoints < 3
						? "Click to designate the corners of the clickable area"
						: "Press Enter to finalize the clickable area") + (numDraftPoints > 0 ? " | Press Esc to cancel" : "")
				);
		}
	}

	function onMapClick(coordinates: { x: number; y: number } | null): void {
		if (selectedTool === Tool.CreateNode && coordinates) createNode(coordinates.x, coordinates.y, nodeTypeToCreate);

		if (
			selectedTool === Tool.EditClickableArea &&
			selectedClickableAreaTool === ClickableAreaTool.AddPoint &&
			coordinates
		) {
			const selectedEditableNode: Node | null = getSelectedClickableAreaNode();
			const points = selectedEditableNode?.clickable_area;
			if (!selectedEditableNode || !points || points.length < 3) return;

			const insertIndex: number = getClosestEdgeInsertIndexForPoint(points, coordinates);
			const nextPoints = [...points.slice(0, insertIndex), coordinates, ...points.slice(insertIndex)];

			upsertNodeClickableArea(selectedEditableNode.id, nextPoints);
			setChangesMade(true);
			return;
		}

		if (
			selectedTool === Tool.EditClickableArea &&
			selectedClickableAreaTool === ClickableAreaTool.SelectNode &&
			coordinates &&
			clickableAreaEditingNodeId !== null
		) {
			const editingNode: Node | undefined = nodes?.find((node) => node.id === clickableAreaEditingNodeId);
			if (!editingNode || editingNode.clickable_area?.length) return;

			setClickableAreaDraftPoints((prevPoints) => {
				const nextPoint = { x: coordinates.x, y: coordinates.y };
				if (
					prevPoints.some((point) => Math.abs(point.x - nextPoint.x) < 0.001 && Math.abs(point.y - nextPoint.y) < 0.001)
				) {
					return prevPoints;
				}

				return [...prevPoints, nextPoint];
			});
		}
	}

	function onMapMouseMove(coordinates: SvgMapCoordinates | null): void {
		if (
			selectedTool !== Tool.EditClickableArea ||
			selectedClickableAreaTool !== ClickableAreaTool.SelectNode ||
			clickableAreaEditingNodeId === null
		) {
			setClickableAreaCursorPosition(null);
			return;
		}

		const editingNode: Node | undefined = nodes?.find((node) => node.id === clickableAreaEditingNodeId);
		if (!editingNode || editingNode.clickable_area?.length) {
			setClickableAreaCursorPosition(null);
			return;
		}

		setClickableAreaCursorPosition(coordinates);
	}

	function onMapMouseLeave(): void {
		if (selectedTool === Tool.EditClickableArea) setClickableAreaCursorPosition(null);
	}

	function onNodeClick(node: Node): void {
		switch (selectedTool) {
			case Tool.SingleSelect:
				handleNodeClickSingleSelectTool(node);
				break;
			case Tool.MultiSelect:
				handleNodeClickMultiSelectTool(node);
				break;
			case Tool.SingleConnect:
				handleNodeClickSingleConnectTool(node);
				break;
			case Tool.MultiConnect:
				handleNodeClickMultiConnectTool(node);
				break;
			case Tool.EditClickableArea:
				handleNodeClickEditClickableArea(node);
				break;
		}
	}

	function handleNodeClickEditClickableArea(node: Node): void {
		if (selectedClickableAreaTool !== ClickableAreaTool.SelectNode) return;

		if (clickableAreaEditingNodeId === node.id) {
			cancelClickableAreaEdit();
			setClickableAreaEditingNodeId(null);
			setSelectedNode(null);
			return;
		}

		setSelectedNode(node);
		setClickableAreaEditingNodeId(node.id);
		setClickableAreaDraftPoints([]);
		setClickableAreaCursorPosition(null);
	}

	function handleNodeClickSingleSelectTool(node: Node): void {
		if (selectedNode === node) setSelectedNode(null);
		else setSelectedNode(node);

		setSelectedEdge(null);
	}

	function handleNodeClickMultiSelectTool(node: Node): void {
		if (!selectedNodesAndEdges.has(node)) {
			setSelectedNodesAndEdges(new Set(selectedNodesAndEdges).add(node));
			return;
		}

		const newSet: Set<Node | Edge> = new Set(selectedNodesAndEdges);
		newSet.delete(node);
		setSelectedNodesAndEdges(newSet);
	}

	function handleNodeClickSingleConnectTool(node: Node): void {
		if (selectedNode === null) return setSelectedNode(node);

		if (selectedNode.id === node.id) return setSelectedNode(null);

		if (nodesHaveConnection(selectedNode, node)) {
			deleteEdge(selectedNode.id, node.id);
			setSelectedNode(null);
			return;
		}

		makeConnection(selectedNode, node);
		setSelectedNode(null);
	}

	function handleNodeClickMultiConnectTool(node: Node): void {
		if (selectedNode === null) return setSelectedNode(node);

		if (selectedNode.id === node.id) return setSelectedNode(null);

		if (nodesHaveConnection(selectedNode, node)) deleteEdge(selectedNode.id, node.id);
		else makeConnection(selectedNode, node);
	}

	function moveNode(nodeId: number, newX: number, newY: number): void {
		setNodes(
			(prevNodes) => prevNodes?.map((node) => (node.id === nodeId ? { ...node, x: newX, y: newY } : node)) ?? null
		);

		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));

		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));

		setChangesMade(true);
	}

	function onEdgeClick(edge: Edge): void {
		switch (selectedTool) {
			case Tool.SingleSelect:
				handleEdgeClickSingleSelectTool(edge);
				break;
			case Tool.MultiSelect:
				handleEdgeClickMultiSelectTool(edge);
				break;
		}
	}

	function handleEdgeClickSingleSelectTool(edge: Edge): void {
		if (selectedEdge === edge) setSelectedEdge(null);
		else setSelectedEdge(edge);

		setSelectedNode(null);
	}

	function handleEdgeClickMultiSelectTool(edge: Edge): void {
		if (!selectedNodesAndEdges.has(edge)) {
			setSelectedNodesAndEdges(new Set(selectedNodesAndEdges).add(edge));
			return;
		}

		const newSet: Set<Node | Edge> = new Set(selectedNodesAndEdges);
		newSet.delete(edge);
		setSelectedNodesAndEdges(newSet);
	}

	function onHoveredNodeChange(node: Node | null): void {
		setHoveredNode((prevNode) => (prevNode?.id === node?.id ? prevNode : node));
	}

	function onHoveredEdgeChange(edge: Edge | null): void {
		setHoveredEdge((prevEdge) => (prevEdge?.id === edge?.id ? prevEdge : edge));
	}

	function isEditableTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;

		const editableTagNames: string[] = ["INPUT", "TEXTAREA"];
		return target.isContentEditable || editableTagNames.includes(target.tagName);
	}

	function deleteSelectedItems(): void {
		if (!nodes || !edges) return;

		const selectedNodeIds: Set<number> = new Set();
		const selectedEdgeIds: Set<string> = new Set();

		if (selectedNode) selectedNodeIds.add(selectedNode.id);
		if (selectedEdge) selectedEdgeIds.add(selectedEdge.id);

		for (const item of selectedNodesAndEdges) {
			if (isNode(item)) selectedNodeIds.add(item.id);
			if (isEdge(item)) selectedEdgeIds.add(item.id);
		}

		if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

		setNodes((prevNodes) => prevNodes?.filter((node) => !selectedNodeIds.has(node.id)) ?? null);
		setEdges(
			(prevEdges) =>
				prevEdges?.filter((edge) => {
					if (selectedNodeIds.has(edge.source_node_id) || selectedNodeIds.has(edge.target_node_id)) return false;
					return !selectedEdgeIds.has(edge.id);
				}) ?? null
		);

		setSelectedNode(null);
		setSelectedEdge(null);
		setSelectedNodesAndEdges(new Set<Node | Edge>());

		setHoveredNode((prevNode) => (prevNode && selectedNodeIds.has(prevNode.id) ? null : prevNode));
		setHoveredEdge((prevEdge) => {
			if (!prevEdge) return prevEdge;

			const deletedWithNode: boolean =
				selectedNodeIds.has(prevEdge.source_node_id) || selectedNodeIds.has(prevEdge.target_node_id);

			if (deletedWithNode) return null;
			return selectedEdgeIds.has(prevEdge.id) ? null : prevEdge;
		});

		setChangesMade(true);
	}

	function onZoomInButtonClicked(): void {
		svgViewerRef.current?.zoomBy(svgViewerZoomStep);
	}

	function onZoomOutButtonClicked(): void {
		svgViewerRef.current?.zoomBy(-svgViewerZoomStep);
	}

	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent): void => {
			if (showCreateBuildingModal || showEditBuildingModal || savePending || discardPending) return;
			if (isEditableTarget(event.target)) return;

			if (selectedTool === Tool.EditClickableArea) {
				if (event.key === "Escape") {
					event.preventDefault();
					cancelClickableAreaEdit();
					return;
				}

				if (event.key === "Enter" && clickableAreaEditingNodeId !== null) {
					event.preventDefault();
					finalizeClickableArea();
					return;
				}
			}

			if (event.key !== "Delete" && event.key !== "Backspace") return;

			const hasSelection: boolean = selectedNode !== null || selectedEdge !== null || selectedNodesAndEdges.size > 0;
			if (!hasSelection) return;

			event.preventDefault();
			deleteSelectedItems();
		};

		window.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [
		selectedNode,
		selectedEdge,
		selectedNodesAndEdges,
		showCreateBuildingModal,
		showEditBuildingModal,
		savePending,
		discardPending,
		nodes,
		edges,
		selectedTool,
		clickableAreaEditingNodeId,
		clickableAreaDraftPoints
	]);

	function isNodeSelected(node: Node): boolean {
		return (
			selectedNode?.id === node.id ||
			Array.from(selectedNodesAndEdges).filter((n) => isNode(n) && n.id === node.id).length > 0
		);
	}

	function isEdgeSelected(edge: Edge): boolean {
		return (
			selectedEdge?.id === edge.id ||
			Array.from(selectedNodesAndEdges).filter((e) => isEdge(e) && e.id === edge.id).length > 0
		);
	}

	function deleteClickableArea(nodeId: number): void {
		setNodes(
			(prevNodes) => prevNodes?.map((node) => (node.id === nodeId ? { ...node, clickable_area: null } : node)) ?? null
		);
		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, clickable_area: null } : prevNode));
		setClickableAreaDraftPoints([]);
		setClickableAreaCursorPosition(null);
		setChangesMade(true);
	}

	function getSelectedClickableAreaNode(): Node | null {
		if (!selectedNode || clickableAreaEditingNodeId !== selectedNode.id) return null;
		return selectedNode;
	}

	function upsertNodeClickableArea(nodeId: number, nextPoints: { x: number; y: number }[] | null): void {
		setNodes(
			(prevNodes) =>
				prevNodes?.map((node) => (node.id === nodeId ? { ...node, clickable_area: nextPoints } : node)) ?? null
		);

		setSelectedNode((prevNode) =>
			prevNode && prevNode.id === nodeId ? { ...prevNode, clickable_area: nextPoints } : prevNode
		);
	}

	function getClosestEdgeInsertIndexForPoint(
		points: { x: number; y: number }[],
		targetPoint: { x: number; y: number }
	): number {
		let minDistanceSquared: number = Number.POSITIVE_INFINITY;
		let insertIndex: number = 1;

		for (let index = 0; index < points.length; index++) {
			const nextIndex: number = (index + 1) % points.length;
			const start = points[index];
			const end = points[nextIndex];
			const segmentDx: number = end.x - start.x;
			const segmentDy: number = end.y - start.y;
			const segmentLengthSquared: number = segmentDx * segmentDx + segmentDy * segmentDy;

			let projectionRatio: number = 0;
			if (segmentLengthSquared > 0) {
				const projectedNumerator: number =
					(targetPoint.x - start.x) * segmentDx + (targetPoint.y - start.y) * segmentDy;
				projectionRatio = Math.min(Math.max(projectedNumerator / segmentLengthSquared, 0), 1);
			}

			const projectedPointX: number = start.x + projectionRatio * segmentDx;
			const projectedPointY: number = start.y + projectionRatio * segmentDy;
			const dx: number = targetPoint.x - projectedPointX;
			const dy: number = targetPoint.y - projectedPointY;
			const distanceSquared: number = dx * dx + dy * dy;

			if (distanceSquared >= minDistanceSquared) continue;

			minDistanceSquared = distanceSquared;
			insertIndex = nextIndex;
		}

		return insertIndex;
	}

	function onClickableAreaToolChange(tool: ClickableAreaTool): void {
		const selectedEditableNode: Node | null = getSelectedClickableAreaNode();
		if (tool === ClickableAreaTool.MovePoints && !selectedEditableNode?.clickable_area?.length) return;
		if (
			tool === ClickableAreaTool.AddPoint &&
			(!selectedEditableNode?.clickable_area || selectedEditableNode.clickable_area.length < 3)
		)
			return;
		if (
			tool === ClickableAreaTool.DeletePoint &&
			(!selectedEditableNode?.clickable_area || selectedEditableNode.clickable_area.length <= 3)
		)
			return;

		setSelectedClickableAreaTool(tool);
		draggedClickableAreaPointRef.current = null;
	}

	function onDeleteClickableAreaActionClick(): void {
		const selectedEditableNode: Node | null = getSelectedClickableAreaNode();
		if (!selectedEditableNode?.clickable_area?.length) return;

		deleteClickableArea(selectedEditableNode.id);
		setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
		draggedClickableAreaPointRef.current = null;
	}

	function getSvgCoordinatesFromPointerEvent(
		event: React.PointerEvent<SVGCircleElement>
	): { x: number; y: number } | null {
		if (svgDimensions.width <= 0 || svgDimensions.height <= 0) return null;

		const imageElement: Element | null = mapContainerRef.current?.querySelector(".viewer img") ?? null;
		const viewerElement: Element | null = mapContainerRef.current?.querySelector(".viewer") ?? null;
		const renderRect: DOMRect | null =
			imageElement instanceof HTMLElement
				? imageElement.getBoundingClientRect()
				: viewerElement instanceof HTMLElement
					? viewerElement.getBoundingClientRect()
					: null;

		if (!renderRect || renderRect.width <= 0 || renderRect.height <= 0) return null;

		const normalizedX: number = (event.clientX - renderRect.left) / renderRect.width;
		const normalizedY: number = (event.clientY - renderRect.top) / renderRect.height;

		if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) return null;

		return {
			x: Math.min(Math.max(normalizedX * svgDimensions.width, 0), svgDimensions.width),
			y: Math.min(Math.max(normalizedY * svgDimensions.height, 0), svgDimensions.height)
		};
	}

	function onClickableAreaPointPointerDown(
		event: React.PointerEvent<SVGCircleElement>,
		nodeId: number,
		pointIndex: number
	): void {
		if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.MovePoints) return;
		if (clickableAreaEditingNodeId !== nodeId) return;

		event.preventDefault();
		event.stopPropagation();
		draggedClickableAreaPointRef.current = { nodeId, pointIndex };
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onClickableAreaPointMouseDown(event: React.MouseEvent<SVGCircleElement>): void {
		if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.MovePoints) return;

		event.preventDefault();
		event.stopPropagation();
	}

	function onClickableAreaPointPointerMove(event: React.PointerEvent<SVGCircleElement>): void {
		const activeDrag = draggedClickableAreaPointRef.current;
		if (!activeDrag) return;

		event.preventDefault();
		event.stopPropagation();

		const nextCoordinates = getSvgCoordinatesFromPointerEvent(event);
		if (!nextCoordinates) return;

		const selectedEditableNode: Node | null = getSelectedClickableAreaNode();
		if (!selectedEditableNode?.clickable_area || selectedEditableNode.id !== activeDrag.nodeId) return;

		const nextPoints = selectedEditableNode.clickable_area.map((point, index) =>
			index === activeDrag.pointIndex ? { ...point, x: nextCoordinates.x, y: nextCoordinates.y } : point
		);

		upsertNodeClickableArea(activeDrag.nodeId, nextPoints);
		setChangesMade(true);
	}

	function onClickableAreaPointPointerUp(event: React.PointerEvent<SVGCircleElement>): void {
		if (draggedClickableAreaPointRef.current) {
			event.preventDefault();
			event.stopPropagation();
			draggedClickableAreaPointRef.current = null;
		}

		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}

	function onClickableAreaPointClick(
		event: React.MouseEvent<SVGCircleElement>,
		nodeId: number,
		pointIndex: number
	): void {
		if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.DeletePoint) return;
		if (clickableAreaEditingNodeId !== nodeId) return;

		event.preventDefault();
		event.stopPropagation();

		const selectedEditableNode: Node | null = getSelectedClickableAreaNode();
		const points = selectedEditableNode?.clickable_area;
		if (!points || points.length <= 3) return;

		const nextPoints = points.filter((_, index) => index !== pointIndex);
		upsertNodeClickableArea(nodeId, nextPoints);

		if (nextPoints.length <= 3) setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);

		setChangesMade(true);
	}

	function finalizeClickableArea(): void {
		if (clickableAreaEditingNodeId === null || !canFinalizeClickableArea(clickableAreaDraftPoints)) return;

		const finalizedArea = clickableAreaDraftPoints.map((point) => ({ x: point.x, y: point.y }));

		setNodes(
			(prevNodes) =>
				prevNodes?.map((node) =>
					node.id === clickableAreaEditingNodeId ? { ...node, clickable_area: finalizedArea } : node
				) ?? null
		);
		setSelectedNode((prevNode) =>
			prevNode && prevNode.id === clickableAreaEditingNodeId ? { ...prevNode, clickable_area: finalizedArea } : prevNode
		);
		cancelClickableAreaEdit();
		setChangesMade(true);
	}

	function createNode(x: number, y: number, nodeType: string): void {
		const widthMatch = svg?.match(/width\s*=\s*["']([^"']+)["']/i);
		const heightMatch = svg?.match(/height\s*=\s*["']([^"']+)["']/i);
		const viewBoxMatch = svg?.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];

		const svgWidth = widthMatch ? Number.parseFloat(widthMatch[1]) : 0;
		const svgHeight = heightMatch ? Number.parseFloat(heightMatch[1]) : 0;
		const viewBoxValues = viewBoxMatch
			?.trim()
			.split(/[\s,]+/)
			.map(Number)
			.filter((value) => Number.isFinite(value));
		const normalizedSvgWidth =
			Number.isFinite(svgWidth) && svgWidth > 0
				? svgWidth
				: viewBoxValues && viewBoxValues.length >= 4
					? viewBoxValues[2]
					: 0;

		const normalizedSvgHeight =
			Number.isFinite(svgHeight) && svgHeight > 0
				? svgHeight
				: viewBoxValues && viewBoxValues.length >= 4
					? viewBoxValues[3]
					: 0;

		if (
			!Number.isFinite(x) ||
			!Number.isFinite(y) ||
			x < 0 ||
			y < 0 ||
			normalizedSvgWidth <= 0 ||
			normalizedSvgHeight <= 0 ||
			x > normalizedSvgWidth ||
			y > normalizedSvgHeight
		) {
			return;
		}

		const newNode: Node = {
			id: Date.now(),
			label: `Node ${nodes!.length + 1}`,
			type: nodeType,
			x,
			y,
			clickable_area: null
		};

		setNodes((prevNodes) => [...prevNodes!, newNode]);
		setSelectedNode(newNode);
		setChangesMade(true);
	}

	function nodesHaveConnection(nodeA: Node, nodeB: Node): boolean {
		return edges!.some(
			(edge) =>
				(edge.source_node_id === nodeA.id && edge.target_node_id === nodeB.id) ||
				(edge.source_node_id === nodeB.id && edge.target_node_id === nodeA.id)
		);
	}

	function makeConnection(sourceNode: Node, targetNode: Node): void {
		console.log(`Making connection from ${sourceNode.label} to ${targetNode.label}`);
		const newEdge: Edge = {
			id: `${sourceNode.id}-${targetNode.id}`, // Temporary unique ID based on source and target node IDs
			source_node_id: sourceNode.id,
			target_node_id: targetNode.id
		};

		setEdges((prevEdges) => [...prevEdges!, newEdge]);
		setChangesMade(true);
	}

	function updateNode(nodeId: number, newLabel: string | null, newType: string | null): void {
		let updatedNode: Node | null = null;

		setNodes((prevNodes) =>
			prevNodes!.map((node) => {
				if (node.id !== nodeId) return node;

				updatedNode = {
					...node,
					label: newLabel !== null ? newLabel : node.label,
					type: newType !== null ? newType : node.type
				};

				return updatedNode;
			})
		);

		if (updatedNode !== null) {
			const nextUpdatedNode: Node = updatedNode;

			setSelectedNode((prevNode) => (prevNode?.id === nodeId ? updatedNode : prevNode));
			setHoveredNode((prevNode) => (prevNode?.id === nodeId ? updatedNode : prevNode));
			setSelectedNodesAndEdges(
				(prevSelection) =>
					new Set(
						Array.from(prevSelection).map((item) => (isNode(item) && item.id === nodeId ? nextUpdatedNode : item))
					)
			);
		}

		setChangesMade(true);
	}

	function deleteNode(nodeId: number): void {
		setNodes((prevNodes) => prevNodes!.filter((node) => node.id !== nodeId));
		setEdges((prevEdges) =>
			prevEdges!.filter((edge) => edge.source_node_id !== nodeId && edge.target_node_id !== nodeId)
		);
		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setSelectedEdge((prevEdge) =>
			prevEdge && (prevEdge.source_node_id === nodeId || prevEdge.target_node_id === nodeId) ? null : prevEdge
		);

		setSelectedNodesAndEdges(
			(prevSelection) =>
				new Set(
					Array.from(prevSelection).filter((item) => {
						if (isNode(item)) return item.id !== nodeId;
						if (isEdge(item)) return !(item.source_node_id === nodeId || item.target_node_id === nodeId);
						return true;
					})
				)
		);

		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setChangesMade(true);
	}

	function deleteEdge(nodeIdA: number, nodeIdB: number): void {
		setEdges((prevEdges) =>
			prevEdges!.filter(
				(edge) =>
					!(edge.source_node_id === nodeIdA && edge.target_node_id === nodeIdB) &&
					!(edge.source_node_id === nodeIdB && edge.target_node_id === nodeIdA)
			)
		);

		setSelectedEdge((prevEdge) => {
			if (!prevEdge) return prevEdge;

			const isDeletedEdge =
				(prevEdge.source_node_id === nodeIdA && prevEdge.target_node_id === nodeIdB) ||
				(prevEdge.source_node_id === nodeIdB && prevEdge.target_node_id === nodeIdA);

			return isDeletedEdge ? null : prevEdge;
		});

		setSelectedNodesAndEdges(
			(prevSelection) =>
				new Set(
					Array.from(prevSelection).filter((item) => {
						if (!isEdge(item)) return true;

						const matchesEdge: boolean =
							(item.source_node_id === nodeIdA && item.target_node_id === nodeIdB) ||
							(item.source_node_id === nodeIdB && item.target_node_id === nodeIdA);

						return !matchesEdge;
					})
				)
		);

		setHoveredNode((prevNode) => (prevNode && (prevNode.id === nodeIdA || prevNode.id === nodeIdB) ? null : prevNode));
		setChangesMade(true);
	}

	async function discardChanges(): Promise<void> {
		console.log("Discarding changes...");

		await loadMapData(selectedBuilding!.code, selectedFloor!);

		setChangesMade(false);
		setDiscardPending(false);
	}

	async function saveChanges(): Promise<void> {
		console.log("Saving changes...");

		if (!selectedBuilding || selectedFloor === null || !nodes || !edges) {
			showWarning("No map data is available to save.", "Unable to Save Changes");
			setSavePending(false);
			return;
		}

		await postChangesToDatabase();

		await loadMapData(selectedBuilding.code, selectedFloor);
		setChangesMade(false);
		setSavePending(false);
	}

	async function postChangesToDatabase(): Promise<void> {
		await updateIndoorMapService(selectedBuilding!.code, selectedFloor!, nodes!, edges!);
	}

	const selectedClickableAreaNode: Node | null = getSelectedClickableAreaNode();
	const canMoveClickableAreaPoints: boolean = Boolean(selectedClickableAreaNode?.clickable_area?.length);
	const canAddClickableAreaPoint: boolean = Boolean(
		selectedClickableAreaNode?.clickable_area && selectedClickableAreaNode.clickable_area.length >= 3
	);
	const canDeleteClickableAreaPoint: boolean = Boolean(
		selectedClickableAreaNode?.clickable_area && selectedClickableAreaNode.clickable_area.length > 3
	);
	const canDeleteClickableArea: boolean = Boolean(selectedClickableAreaNode?.clickable_area?.length);

	return (
		<>
			<div className="header-row">
				<div className="left-side">
					{/* Building Dropdown */}
					<div className="selector-container">
						<p>Building:</p>
						<select
							value={selectedBuilding?.code || ""}
							onChange={(e) => onSelectedBuildingChange(buildings.find((b) => b.code === e.target.value)!)}
							disabled={changesMade}
						>
							<option value="" disabled>
								---
							</option>

							{buildings.length > 0 &&
								buildings.map((building) => (
									<option key={building.code} value={building.code}>
										{building.code}
									</option>
								))}
						</select>
					</div>

					{/* Floor Dropdown */}
					{selectedBuilding && (
						<div className="selector-container">
							<p>Floor:</p>
							<select
								value={selectedFloor || ""}
								onChange={(e) => onSelectedFloorChange(parseInt(e.target.value))}
								disabled={changesMade}
							>
								<option value="" disabled>
									---
								</option>

								{Array.from({ length: selectedBuilding?.num_floors || 0 }, (_, i) => (
									<option key={i + 1} value={i + 1}>
										{i + 1}
									</option>
								))}
							</select>
						</div>
					)}

					{/* Create Building Button */}
					{!selectedBuilding && (
						<button
							onClick={() => {
								setShowCreateBuildingModal(true);
							}}
							className="outline-button secondary"
						>
							<img src={addIcon} alt="create icon" />
							Create Building
						</button>
					)}

					{/* Edit Building Button */}
					{selectedBuilding && (
						<button
							onClick={() => {
								setShowEditBuildingModal(true);
							}}
							disabled={selectedBuilding === null || changesMade}
							className="outline-button secondary"
						>
							<img src={editIcon} alt="edit icon" />
							Edit Building
						</button>
					)}
				</div>

				{/* Node Type Dropdown */}
				{selectedTool === Tool.CreateNode && (
					<div className="selector-container">
						<p>New Node's Type:</p>

						<select value={nodeTypeToCreate} onChange={(e) => setNodeTypeToCreate(e.target.value)}>
							{Object.values(NodeType).map((type) => (
								<option key={type} value={type}>
									{type.charAt(0).toUpperCase() + type.slice(1)}
								</option>
							))}
						</select>
					</div>
				)}

				<div className="right-side">
					{/* Discard Button */}
					<button
						onClick={() => {
							setDiscardPending(true);
						}}
						disabled={!changesMade}
						className="outline-button danger"
					>
						Discard
					</button>

					{/* Save Button */}
					<button
						onClick={() => {
							setSavePending(true);
						}}
						disabled={!changesMade}
						className="button primary"
					>
						<img src={saveIcon} alt="save icon" />
						Save
					</button>
				</div>
			</div>

			{/* Editor */}
			{mapLoaded && (
				<div className="editor">
					<div ref={mapContainerRef} className="map">
						{getToolHintText() && (
							<div
								style={{
									position: "absolute",
									top: 12,
									left: "50%",
									transform: "translateX(-50%)",
									background: "rgba(0, 0, 0, 0.65)",
									color: "#fff",
									padding: "6px 10px",
									borderRadius: 8,
									fontSize: 12,
									lineHeight: 1.3,
									pointerEvents: "none",
									zIndex: 10
								}}
							>
								{getToolHintText()}
							</div>
						)}

						<SvgViewerComponent
							ref={svgViewerRef}
							svg={svg!}
							allowPan={
								selectedTool !== Tool.CreateNode &&
								(selectedTool !== Tool.MultiSelect || !isShiftPressed)
							}
							selectedTool={selectedTool}
							isClickableAreaDraftActive={clickableAreaEditingNodeId !== null}
							onMapClick={onMapClick}
							onMapMouseMove={onMapMouseMove}
							onMapMouseLeave={onMapMouseLeave}
						>
							{selectedTool === Tool.EditClickableArea && (
								<div
									style={{
										position: "absolute",
										inset: 0,
										zIndex: 2,
										pointerEvents: "none"
									}}
								>
									<svg
										viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
										preserveAspectRatio="none"
										style={{ width: "100%", height: "100%" }}
									>
										{nodes!.map((node) => {
											const area = node.clickable_area;
											if (area && area.length >= 3) {
												return (
													<g key={node.id}>
														<polygon
															points={buildClickableAreaPoints(area)}
															fill={toRgba(getNodeTypeHexColor(node.type), 0.12)}
															stroke={toRgba(getNodeTypeHexColor(node.type), 0.45)}
															strokeWidth={0.5}
														/>
														{area.map((point, index) => (
															<circle
																key={`${node.id}-${index}`}
																cx={point.x}
																cy={point.y}
																r={
																	(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
																		selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
																	clickableAreaEditingNodeId === node.id
																		? 1.6
																		: 1
																}
																fill="rgba(255, 255, 255, 0.8)"
																stroke="rgba(255, 255, 255, 0.9)"
																strokeWidth={0.5}
																style={{
																	cursor:
																		(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
																			selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
																		clickableAreaEditingNodeId === node.id
																			? selectedClickableAreaTool === ClickableAreaTool.MovePoints
																				? "move"
																				: "pointer"
																			: "default",
																	pointerEvents:
																		(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
																			selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
																		clickableAreaEditingNodeId === node.id
																			? "all"
																			: "none"
																}}
																onPointerDown={(event) => onClickableAreaPointPointerDown(event, node.id, index)}
																onPointerMove={onClickableAreaPointPointerMove}
																onPointerUp={onClickableAreaPointPointerUp}
																onPointerCancel={onClickableAreaPointPointerUp}
																onMouseDown={onClickableAreaPointMouseDown}
																onClick={(event) => onClickableAreaPointClick(event, node.id, index)}
															/>
														))}
													</g>
												);
											}

											if (clickableAreaEditingNodeId === node.id) {
												const previewPoints = [
													...clickableAreaDraftPoints,
													...(clickableAreaCursorPosition ? [clickableAreaCursorPosition] : [])
												];

												if (previewPoints.length === 0) return null;

												return (
													<g key={node.id}>
														<polygon
															points={buildClickableAreaPoints(clickableAreaDraftPoints, clickableAreaCursorPosition)}
															fill={toRgba(getNodeTypeHexColor(node.type), 0.12)}
															stroke={toRgba(getNodeTypeHexColor(node.type), 0.45)}
															strokeWidth={0.5}
														/>
														{previewPoints.map((point, index) => (
															<circle
																key={`${node.id}-draft-${index}`}
																cx={point.x}
																cy={point.y}
																r={1}
																fill="rgba(255, 255, 255, 0.8)"
																stroke="rgba(255, 255, 255, 0.9)"
																strokeWidth={0.5}
															/>
														))}
													</g>
												);
											}

											return null;
										})}
									</svg>
								</div>
							)}

							{edges!.map((edge) => {
								const sourceNode = nodes!.find((node) => node.id === edge.source_node_id);
								const targetNode = nodes!.find((node) => node.id === edge.target_node_id);

								if (!sourceNode || !targetNode) return null;

								return (
									<EdgeComponent
										key={edge.id}
										edge={edge}
										sourceNode={sourceNode}
										targetNode={targetNode}
										isSelected={isEdgeSelected(edge)}
										selectedTool={selectedTool}
										onEdgeClick={onEdgeClick}
										setHoveredEdge={onHoveredEdgeChange}
									/>
								);
							})}

							{nodes!.map((node) => (
								<NodeComponent
									key={node.id}
									node={node}
									isSelected={isNodeSelected(node)}
									selectedTool={selectedTool}
									onNodeClick={onNodeClick}
									setHoveredNode={onHoveredNodeChange}
									moveNode={moveNode}
								/>
							))}
						</SvgViewerComponent>
					</div>

					{selectedTool === Tool.EditClickableArea && (
						<div className="clickable-area-toolbar">
							<ClickableAreaToolbar
								selectedTool={selectedClickableAreaTool}
								onToolChange={onClickableAreaToolChange}
								onDeleteArea={onDeleteClickableAreaActionClick}
								canMovePoints={canMoveClickableAreaPoints}
								canAddPoint={canAddClickableAreaPoint}
								canDeletePoint={canDeleteClickableAreaPoint}
								canDeleteArea={canDeleteClickableArea}
							/>
						</div>
					)}

					<div className="toolbar">
						<IndoorMapEditorToolbar
							selectedTool={selectedTool}
							setSelectedTool={onSelectedToolChange}
							zoomStep={svgViewerZoomStep}
							onZoomIn={onZoomInButtonClicked}
							onZoomOut={onZoomOutButtonClicked}
						/>
					</div>

					{/* Map Key */}
					<div className="key-container">
						<span className="key-title">Key</span>
						{key.map((item, index) => (
							<div key={index} className="key-item">
								<img src={item.icon} alt={item.label} className={clsx("key-icon", item.className)} />
								<span>{item.label}</span>
							</div>
						))}
					</div>

					<div className="context-overlays">
						{/* Contextual information about the hovered node/edge */}
						{((hoveredNode && hoveredNode !== selectedNode) || (hoveredEdge && hoveredEdge !== selectedEdge)) &&
							(selectedNodesAndEdges.size !== 1 ||
								(hoveredNode !== (Array.from(selectedNodesAndEdges)[0] as Node) &&
									hoveredEdge !== (Array.from(selectedNodesAndEdges)[0] as Edge))) && (
								<IndoorGraphContextComponent
									nodes={hoveredNode ? [hoveredNode] : []}
									edges={hoveredEdge ? [hoveredEdge] : []}
									isHovered={true}
								/>
							)}

						{/* Contextual information about the selected node/edge */}
						{(selectedNode || selectedEdge || selectedNodesAndEdges.size > 0) && (
							<IndoorGraphContextComponent
								nodes={
									selectedNode
										? [selectedNode]
										: selectedNodesAndEdges.size > 0
											? Array.from(selectedNodesAndEdges).filter(isNode)
											: []
								}
								edges={
									selectedEdge
										? [selectedEdge]
										: selectedNodesAndEdges.size > 0
											? Array.from(selectedNodesAndEdges).filter(isEdge)
											: []
								}
								isHovered={false}
								updateNode={updateNode}
								deleteNode={deleteNode}
								deleteEdge={deleteEdge}
							/>
						)}
					</div>

					{/* Save confirmation modal */}
					<ConfirmationModal
						isOpen={savePending}
						title="Confirm Save Changes"
						content="Are you sure you want to save the changes? This action will be made live immediately to all users."
						onClose={() => {
							setSavePending(false);
						}}
						onConfirm={saveChanges}
					/>

					{/* Discard confirmation modal */}
					<ConfirmationModal
						isOpen={discardPending}
						title="Confirm Discard Changes"
						content="Are you sure you want to discard the changes? This action cannot be undone."
						onClose={() => {
							setDiscardPending(false);
						}}
						onConfirm={discardChanges}
						isDanger={true}
					/>
				</div>
			)}

			{/* Create Building Modal */}
			{showCreateBuildingModal && (
				<BuildingModal onClose={() => setShowCreateBuildingModal(false)} onBuildingSaved={refreshBuildings} />
			)}

			{/* Edit Building Modal */}
			{showEditBuildingModal && (
				<BuildingModal
					bld_id={selectedBuilding!.id}
					onClose={() => setShowEditBuildingModal(false)}
					onBuildingSaved={refreshBuildings}
				/>
			)}
		</>
	);
}
