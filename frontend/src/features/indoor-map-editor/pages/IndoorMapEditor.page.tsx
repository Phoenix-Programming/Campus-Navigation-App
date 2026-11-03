import React, { useEffect, useRef, useState } from "react";
import DragSelect from "dragselect";
import { type Node, type Edge } from "../models/buildings_models";
import { ClickableAreaTool, Tool, type DragSelectionMode } from "../models/indoor_map_editor_models";
import { type SvgViewerHandle } from "../models/svg_viewer_models";
import { isEdge } from "../components/EdgeComponent";
import { useClickableAreaEditor } from "../hooks/useClickableAreaEditor";
import { useMapEditorKeyboard } from "../hooks/useMapEditorKeyboard";
import { useMapLifecycle } from "../hooks/useMapLifecycle";
import { useMapSelection } from "../hooks/useMapSelection";
import { useMapToolState } from "../hooks/useMapToolState";
import { useSvgDimensions } from "../hooks/useSvgDimensions";
import BuildingModal from "../components/BuildingModal";
import ConfirmSaveDiscardModals from "../components/ConfirmSaveDiscardModals";
import IndoorMapEditorHeader from "../components/IndoorMapEditorHeader";
import IndoorMapEditorMap from "../components/IndoorMapEditorMap";
import { isNode } from "../components/NodeComponent";
import { showWarning } from "@features/notifications/services/notifications.service";
import "@shared/styles/main.scss";

export default function IndoorMapEditor(): React.JSX.Element {
	const svgViewerZoomStep: number = 0.1;
	const isMacOS: boolean = /Mac|iPhone|iPad|iPod/i.test(navigator.platform);

	const svgViewerRef = useRef<SvgViewerHandle | null>(null);
	const mapContainerRef = useRef<HTMLDivElement | null>(null);
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
	const draggedClickableAreaPointRef = useRef<{ nodeId: number; pointIndex: number } | null>(null);

	const {
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
	} = useMapLifecycle();

	const selection = useMapSelection({
		nodes,
		edges,
		selectedTool,
		setChangesMade,
		makeConnection,
		deleteEdge,
		nodesHaveConnection
	});
	const {
		selectedNode,
		setSelectedNode,
		selectedEdge,
		setSelectedEdge,
		selectedNodesAndEdges,
		setSelectedNodesAndEdges,
		hoveredNode,
		setHoveredNode,
		hoveredEdge,
		setHoveredEdge,
		isNodeSelected,
		isEdgeSelected,
		deleteSelectedItems,
		onNodeClick,
		onEdgeClick,
		onHoveredNodeChange,
		onHoveredEdgeChange
	} = selection;

	const toolState = useMapToolState({
		selectedTool,
		selectedNode,
		selectedEdge,
		selectedNodesAndEdges,
		selectedClickableAreaTool: ClickableAreaTool.SelectNode,
		clickableAreaEditingNodeId: null,
		clickableAreaDraftPoints: [],
		setSelectedTool,
		setSelectedNode,
		setSelectedEdge,
		setSelectedNodesAndEdges,
		setSelectedClickableAreaTool: () => undefined,
		setClickableAreaEditingNodeId: () => undefined,
		cancelClickableAreaEdit: () => undefined,
		primaryModifierLabel: isMacOS ? "⌘" : "⌃"
	});
	const { onSelectedToolChange, getToolHintText } = toolState;

	const svgDimensions = useSvgDimensions(svg);

	const clickableArea = useClickableAreaEditor({
		nodes,
		setNodes,
		selectedNode,
		selectedTool,
		svgDimensions,
		setChangesMade,
		mapContainerRef,
		onSelectedNodeChange: setSelectedNode,
		onCreateNode: (coordinates) => createNode(coordinates.x, coordinates.y, nodeTypeToCreate)
	});
	const {
		clickableAreaEditingNodeId,
		setClickableAreaEditingNodeId,
		selectedClickableAreaTool,
		setSelectedClickableAreaTool,
		clickableAreaDraftPoints,
		setClickableAreaDraftPoints,
		clickableAreaCursorPosition,
		setClickableAreaCursorPosition,
		cancelClickableAreaEdit,
		handleNodeClickEditClickableArea,
		onMapClick,
		onMapMouseMove,
		onMapMouseLeave,
		onClickableAreaToolChange,
		onDeleteClickableAreaActionClick,
		onClickableAreaPointPointerDown,
		onClickableAreaPointPointerMove,
		onClickableAreaPointPointerUp,
		onClickableAreaPointMouseDown,
		onClickableAreaPointClick,
		finalizeClickableArea,
		canMoveClickableAreaPoints,
		canAddClickableAreaPoint,
		canDeleteClickableAreaPoint,
		canDeleteClickableArea,
		draggedClickableAreaPointRef: clickableDragRef
	} = clickableArea;

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

	function onZoomInButtonClicked(): void {
		svgViewerRef.current?.zoomBy(svgViewerZoomStep);
	}

	function onZoomOutButtonClicked(): void {
		svgViewerRef.current?.zoomBy(-svgViewerZoomStep);
	}

	useMapEditorKeyboard({
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
		clickableAreaDraftPoints,
		deleteSelectedItems,
		cancelClickableAreaEdit,
		finalizeClickableArea
	});

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

	function moveNode(nodeId: number, newX: number, newY: number): void {
		setNodes(
			(prevNodes) => prevNodes?.map((node) => (node.id === nodeId ? { ...node, x: newX, y: newY } : node)) ?? null
		);
		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));
		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));
		setChangesMade(true);
	}

	return (
		<>
			<IndoorMapEditorHeader
				buildings={buildings}
				selectedBuilding={selectedBuilding}
				selectedFloor={selectedFloor}
				selectedTool={selectedTool}
				nodeTypeToCreate={nodeTypeToCreate}
				changesMade={changesMade}
				onSelectedBuildingChange={onSelectedBuildingChange}
				onSelectedFloorChange={onSelectedFloorChange}
				onNodeTypeChange={setNodeTypeToCreate}
				onCreateBuilding={() => setShowCreateBuildingModal(true)}
				onEditBuilding={() => setShowEditBuildingModal(true)}
				onDiscard={() => setDiscardPending(true)}
				onSave={() => setSavePending(true)}
			/>

			{mapLoaded && (
				<IndoorMapEditorMap
					svgViewerRef={svgViewerRef}
					mapContainerRef={mapContainerRef}
					svg={svg!}
					svgDimensions={svgDimensions}
					nodes={nodes!}
					edges={edges!}
					selectedTool={selectedTool}
					selectedNode={selectedNode}
					selectedEdge={selectedEdge}
					selectedNodesAndEdges={selectedNodesAndEdges}
					hoveredNode={hoveredNode}
					hoveredEdge={hoveredEdge}
					selectedClickableAreaTool={selectedClickableAreaTool}
					clickableAreaEditingNodeId={clickableAreaEditingNodeId}
					clickableAreaDraftPoints={clickableAreaDraftPoints}
					clickableAreaCursorPosition={clickableAreaCursorPosition}
					isShiftPressed={isShiftPressed}
					canMoveClickableAreaPoints={canMoveClickableAreaPoints}
					canAddClickableAreaPoint={canAddClickableAreaPoint}
					canDeleteClickableAreaPoint={canDeleteClickableAreaPoint}
					canDeleteClickableArea={canDeleteClickableArea}
					getToolHintText={getToolHintText}
					onMapClick={onMapClick}
					onMapMouseMove={onMapMouseMove}
					onMapMouseLeave={onMapMouseLeave}
					onNodeClick={onNodeClick}
					onClickableAreaNodeSelect={handleNodeClickEditClickableArea}
					onEdgeClick={onEdgeClick}
					onHoveredNodeChange={onHoveredNodeChange}
					onHoveredEdgeChange={onHoveredEdgeChange}
					onClickableAreaToolChange={onClickableAreaToolChange}
					onDeleteClickableAreaActionClick={onDeleteClickableAreaActionClick}
					onClickableAreaPointPointerDown={onClickableAreaPointPointerDown}
					onClickableAreaPointPointerMove={onClickableAreaPointPointerMove}
					onClickableAreaPointPointerUp={onClickableAreaPointPointerUp}
					onClickableAreaPointMouseDown={onClickableAreaPointMouseDown}
					onClickableAreaPointClick={onClickableAreaPointClick}
					onZoomIn={onZoomInButtonClicked}
					onZoomOut={onZoomOutButtonClicked}
					onToolSelect={onSelectedToolChange}
					svgViewerZoomStep={svgViewerZoomStep}
					moveNode={moveNode}
					isNodeSelected={isNodeSelected}
					isEdgeSelected={isEdgeSelected}
					updateNode={updateNode}
					deleteNode={deleteNode}
					deleteEdge={deleteEdge}
				/>
			)}

			<ConfirmSaveDiscardModals
				savePending={savePending}
				discardPending={discardPending}
				onSaveClose={() => setSavePending(false)}
				onSaveConfirm={saveChanges}
				onDiscardClose={() => setDiscardPending(false)}
				onDiscardConfirm={discardChanges}
			/>

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
