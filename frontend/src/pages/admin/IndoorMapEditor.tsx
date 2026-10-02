import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import ConfirmationModal from "../../components/ConfirmationModal";
import EdgeComponent, { isEdge, type Edge } from "../../components/EdgeComponent";
import BuildingModal from "../../components/BuildingModal";
import IndoorGraphContextComponent from "../../components/IndoorGraphContextComponent";
import IndoorMapEditorToolbar, { Tool } from "../../components/IndoorMapEditorToolbar";
import NodeComponent, { isNode, NodeType, type Node } from "../../components/NodeComponent";
import SvgViewerComponent, { type SvgViewerHandle } from "../../components/SvgViewerComponent";
import api from "../../api";
import circleIcon from "@assets/icons/circle.svg";
import lineIcon from "@assets/icons/remove.svg";
import addIcon from "@assets/icons/add.svg";
import editIcon from "@assets/icons/edit.svg";
import saveIcon from "@assets/icons/save.svg";
import "@styles/main.scss";
import "@styles/pages/indoor-map-editor.scss";

interface GetIndoorMapResponse {
	svg: string;
	nodes: Node[];
	edges: Edge[];
}

interface GetBuildingsResponse {
	buildings: Building[];
}

interface UpdateIndoorMapRequest {
	bld_code: string;
	floor_num: number;
	nodes: Node[];
	edges: Edge[];
}

interface Building {
	id: number;
	name: string;
	code: string;
	num_floors: number;
}

export default function IndoorMapEditor(): React.JSX.Element {
	const svgViewerZoomStep = 0.1;
	const key = [
		{ icon: circleIcon, label: "Room", className: "room" },
		{ icon: circleIcon, label: "Room Door", className: "room-door" },
		{ icon: circleIcon, label: "Hallway", className: "hallway" },
		{ icon: circleIcon, label: "Staircase", className: "stairs" },
		{ icon: circleIcon, label: "Elevator", className: "elevator" },
		{ icon: lineIcon, label: "Connection", className: "connection" }
	];

	const svgViewerRef = useRef<SvgViewerHandle>(null);

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

	console.log("Current Selected Node:", selectedNode);
	console.log("Current Selected Nodes and Edges:", Array.from(selectedNodesAndEdges));

	useEffect(() => { getBuildings(); }, []);

	useEffect(() => {
		if (svg !== null && nodes !== null && edges != null) setMapLoaded(true);
		else setMapLoaded(false);
	}, [svg, nodes, edges]);

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

		// Temporary hardcoded data for testing purposes
		setNodes([
			{ id: "1", name: "Node 1", type: "room", x: 100, y: 250 },
			{ id: "2", name: "Node 2", type: "hallway", x: 200, y: 150 },
			{ id: "3", name: "Node 3", type: "room", x: 300, y: 200 }
		]);

		setEdges([
			{ id: "1-2", sourceNodeId: "1", targetNodeId: "2" },
			{ id: "2-3", sourceNodeId: "2", targetNodeId: "3" }
		]);
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

	async function getBuildings(): Promise<void> {
		try {
			const response: GetBuildingsResponse = (await api.get("/api/buildings")).data;

			setBuildings(response.buildings);
		} catch (error) {
			console.error("Error fetching buildings:", error);
		}
	}

	async function getIndoorMapData(bldCode: string, floor: number): Promise<void> {
		try {
			const response: GetIndoorMapResponse = (await api.get("/api/buildings/map", {
				params: {
					bld_code: bldCode,
					floor_num: floor
				}
			})).data;

			setSvg(response.svg);
			setNodes(response.nodes);
			setEdges(response.edges);
		} catch (error) {
			console.error("Error fetching indoor map data:", error);
		}
	}

	function onSelectedToolChange(tool: Tool): void {
		if (tool === selectedTool) return;

		setSelectedTool(tool);

		switch (tool) {
			case Tool.SingleSelect:
				if (selectedNodesAndEdges.size === 1) {
					const firstItem = Array.from(selectedNodesAndEdges)[0];
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
					const firstItem = Array.from(selectedNodesAndEdges)[0];
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
		}
	}

	function onMapClick(coordinates: { x: number; y: number } | null): void {
		if (selectedTool === Tool.CreateNode && coordinates) createNode(coordinates.x, coordinates.y, nodeTypeToCreate);
	}

	function onNodeClick(node: Node): void {
		switch (selectedTool) {
			case Tool.SingleSelect: handleNodeClickSingleSelectTool(node);
			break;
			case Tool.MultiSelect: handleNodeClickMultiSelectTool(node);
			break;
			case Tool.SingleConnect: handleNodeClickSingleConnectTool(node);
			break;
			case Tool.MultiConnect: handleNodeClickMultiConnectTool(node);
			break;
		}
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

	function moveNode(nodeId: string, newX: number, newY: number): void {
		setNodes(
			(prevNodes) => prevNodes?.map((node) => (node.id === nodeId ? { ...node, x: newX, y: newY } : node)) ?? null
		);

		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));

		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? { ...prevNode, x: newX, y: newY } : prevNode));

		setChangesMade(true);
	}

	function onEdgeClick(edge: Edge): void {
		switch (selectedTool) {
			case Tool.SingleSelect: handleEdgeClickSingleSelectTool(edge);
			break;
			case Tool.MultiSelect: handleEdgeClickMultiSelectTool(edge);
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

	function onZoomInButtonClicked(): void {
		svgViewerRef.current?.zoomBy(svgViewerZoomStep);
	}

	function onZoomOutButtonClicked(): void {
		svgViewerRef.current?.zoomBy(-svgViewerZoomStep);
	}

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
			Number.isFinite(svgWidth) &&
				svgWidth > 0 ? svgWidth : viewBoxValues &&
				viewBoxValues.length >= 4 ? viewBoxValues[2] : 0;

		const normalizedSvgHeight =
			Number.isFinite(svgHeight) &&
				svgHeight > 0 ? svgHeight : viewBoxValues &&
				viewBoxValues.length >= 4 ? viewBoxValues[3] : 0;

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
			id: `${Date.now()}`,
			name: `Node ${nodes!.length + 1}`,
			type: nodeType,
			x, y
		};

		setNodes((prevNodes) => [...prevNodes!, newNode]);
		setSelectedNode(newNode);
		setChangesMade(true);
	}

	function nodesHaveConnection(nodeA: Node, nodeB: Node): boolean {
		return edges!.some((edge) =>
			(edge.sourceNodeId === nodeA.id && edge.targetNodeId === nodeB.id) ||
			(edge.sourceNodeId === nodeB.id && edge.targetNodeId === nodeA.id)
		);
	}

	function makeConnection(sourceNode: Node, targetNode: Node): void {
		console.log(`Making connection from ${sourceNode.name} to ${targetNode.name}`);
		const newEdge: Edge = {
			id: `${sourceNode.id}-${targetNode.id}`, // Temporary unique ID based on source and target node IDs
			sourceNodeId: sourceNode.id,
			targetNodeId: targetNode.id
		};

		setEdges((prevEdges) => [...prevEdges!, newEdge]);
		setChangesMade(true);
	}

	function updateNode(nodeId: string, newLabel: string | null, newType: string | null): void {
		let updatedNode: Node | null = null;

		setNodes((prevNodes) =>
			prevNodes!.map((node) => {
				if (node.id !== nodeId) return node;

				updatedNode = {
					...node,
					name: newLabel !== null ? newLabel : node.name,
					type: newType !== null ? newType : node.type
				};

				return updatedNode;
			})
		);

		if (updatedNode !== null) {
			const nextUpdatedNode: Node = updatedNode;

			setSelectedNode((prevNode) => (prevNode?.id === nodeId ? updatedNode : prevNode));
			setHoveredNode((prevNode) => (prevNode?.id === nodeId ? updatedNode : prevNode));
			setSelectedNodesAndEdges((prevSelection) => new Set(
				Array.from(prevSelection).map((item) => (isNode(item) && item.id === nodeId ? nextUpdatedNode : item))
			));
		}

		setChangesMade(true);
	}

	function deleteNode(nodeId: string): void {
		setNodes((prevNodes) => prevNodes!.filter((node) => node.id !== nodeId));
		setEdges((prevEdges) => prevEdges!.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId));
		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setSelectedEdge((prevEdge) =>
			prevEdge && (prevEdge.sourceNodeId === nodeId || prevEdge.targetNodeId === nodeId) ? null : prevEdge
		);

		setSelectedNodesAndEdges(
			(prevSelection) =>
				new Set(Array.from(prevSelection).filter((item) => {
					if (isNode(item)) return item.id !== nodeId;
					if (isEdge(item)) return !(item.sourceNodeId === nodeId || item.targetNodeId === nodeId);
					return true;
				}))
		);

		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setChangesMade(true);
	}

	function deleteEdge(nodeIdA: string, nodeIdB: string): void {
		setEdges((prevEdges) =>
			prevEdges!.filter((edge) =>
				!(edge.sourceNodeId === nodeIdA && edge.targetNodeId === nodeIdB) &&
				!(edge.sourceNodeId === nodeIdB && edge.targetNodeId === nodeIdA)
			)
		);

		setSelectedEdge((prevEdge) => {
			if (!prevEdge) return prevEdge;

			const isDeletedEdge =
				(prevEdge.sourceNodeId === nodeIdA && prevEdge.targetNodeId === nodeIdB) ||
				(prevEdge.sourceNodeId === nodeIdB && prevEdge.targetNodeId === nodeIdA);

			return isDeletedEdge ? null : prevEdge;
		});

		setSelectedNodesAndEdges(
			(prevSelection) => new Set(Array.from(prevSelection).filter((item) => {
				if (!isEdge(item)) return true;

				const matchesEdge: boolean =
					(item.sourceNodeId === nodeIdA && item.targetNodeId === nodeIdB) ||
					(item.sourceNodeId === nodeIdB && item.targetNodeId === nodeIdA);

				return !matchesEdge;
			}))
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

		await postChangesToDatabase();

		await loadMapData(selectedBuilding!.code, selectedFloor!);
		setChangesMade(false);
		setSavePending(false);
	}

	async function postChangesToDatabase(): Promise<void> {
		try {
			const payload: UpdateIndoorMapRequest = {
				bld_code: selectedBuilding!.code,
				floor_num: selectedFloor!,
				nodes: nodes!,
				edges: edges!
			};

			await api.post("/api/buildings/map", payload);
		} catch (error) {
			console.error("Error saving changes to the database:", error);
		}
	}

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
							<option value="" disabled>---</option>

							{buildings.length > 0 && buildings.map((building) => (
								<option key={building.code} value={building.code}>{building.code}</option>
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
								<option value="" disabled>---</option>

								{Array.from({ length: selectedBuilding?.num_floors || 0 }, (_, i) => (
									<option key={i + 1} value={i + 1}>{i + 1}</option>
								))}
							</select>
						</div>
					)}

					{/* Create Building Button */}
					{!selectedBuilding && (
						<button
							onClick={() => { setShowCreateBuildingModal(true); }}
							className="outline-button secondary"
						>
							<img src={addIcon} alt="create icon" />
							Create Building
						</button>
					)}

					{/* Edit Building Button */}
					{selectedBuilding && (
						<button
							onClick={() => { setShowEditBuildingModal(true); }}
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
						onClick={() => { setDiscardPending(true); }}
						disabled={!changesMade}
						className="outline-button danger"
					>
						Discard
					</button>

					{/* Save Button */}
					<button
						onClick={() => { setSavePending(true); }}
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
					<div className="map">
						<SvgViewerComponent
							ref={svgViewerRef}
							svg={svg!}
							allowPan={selectedTool !== Tool.CreateNode}
							selectedTool={selectedTool}
							onMapClick={onMapClick}
						>
							{edges!.map((edge) => {
								const sourceNode = nodes!.find((node) => node.id === edge.sourceNodeId);
								const targetNode = nodes!.find((node) => node.id === edge.targetNodeId);

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
						{(
							(hoveredNode && hoveredNode !== selectedNode) ||
							(hoveredEdge && hoveredEdge !== selectedEdge)
						) && (
							selectedNodesAndEdges.size !== 1 || (
								hoveredNode !== (Array.from(selectedNodesAndEdges)[0] as Node) &&
								hoveredEdge !== (Array.from(selectedNodesAndEdges)[0] as Edge)
							)
						) && (
							<IndoorGraphContextComponent
								nodes={hoveredNode ? [hoveredNode] : []}
								edges={hoveredEdge ? [hoveredEdge] : []}
								isHovered={true}
							/>
						)}

						{/* Contextual information about the selected node/edge */}
						{(selectedNode || selectedEdge || selectedNodesAndEdges.size > 0) && (
							<IndoorGraphContextComponent
								nodes={selectedNode ? [selectedNode] : selectedNodesAndEdges.size > 0 ? Array.from(selectedNodesAndEdges).filter(isNode) : []}
								edges={selectedEdge ? [selectedEdge] : selectedNodesAndEdges.size > 0 ? Array.from(selectedNodesAndEdges).filter(isEdge) : []}
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
						onClose={() => { setSavePending(false); }}
						onConfirm={saveChanges}
					/>

					{/* Discard confirmation modal */}
					<ConfirmationModal
						isOpen={discardPending}
						title="Confirm Discard Changes"
						content="Are you sure you want to discard the changes? This action cannot be undone."
						onClose={() => { setDiscardPending(false); }}
						onConfirm={discardChanges}
						isDanger={true}
					/>
				</div>
			)}

			{/* Create Building Modal */}
			{showCreateBuildingModal && <BuildingModal onClose={() => setShowCreateBuildingModal(false)} />}

			{/* Edit Building Modal */}
			{showEditBuildingModal && (
				<BuildingModal bld_id={selectedBuilding!.id} onClose={() => setShowEditBuildingModal(false)} />
			)}
		</>
	);
}
