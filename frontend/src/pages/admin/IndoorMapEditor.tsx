import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import ConfirmationModal from "../../components/ConfirmationModal";
import EdgeComponent, { isEdge, type Edge } from "../../components/EdgeComponent";
import IndoorGraphContextComponent from "../../components/IndoorGraphContextComponent";
import IndoorMapEditorToolbar, { Tool } from "../../components/IndoorMapEditorToolbar";
import NodeComponent, { isNode, type Node } from "../../components/NodeComponent";
import SvgViewerComponent, { type SvgViewerHandle } from "../../components/SvgViewerComponent";
import api from "../../api";
import circleIcon from "@assets/icons/circle.svg";
import lineIcon from "@assets/icons/remove.svg";
import "@styles/pages/indoor-map-editor.scss";

interface GetIndoorMapResponse {
	svg: string;
	nodes: Node[];
	edges: Edge[];
}

interface GetBuildingsResponse {
	buildings: Building[];
}

interface Building {
	name: string;
	code: string;
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
	const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [svg, setSvg] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Node[] | null>(null);
	const [edges, setEdges] = useState<Edge[] | null>(null);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
	const [selectedNodesAndEdges, setSelectedNodesAndEdges] = useState<Set<Node | Edge>>(new Set<Node | Edge>());
	const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
	const [selectedTool, setSelectedTool] = useState<Tool>(Tool.SingleSelect);
	const [changesMade, setChangesMade] = useState(false);
	const [savePending, setSavePending] = useState(false);
	const [discardPending, setDiscardPending] = useState(false);
	const [nodeTypeToCreate, setNodeTypeToCreate] = useState<string>("room");

	useEffect(() => {
		//getBuildings();
		// Temporary hardcoded buildings for testing
		setBuildings([
			{
				name: "Innovation, Science and Technology Building",
				code: "IST"
			}
		]);
	}, []);

	useEffect(() => {
		if (svg && nodes && edges) setMapLoaded(true);
		else setMapLoaded(false);
	}, [svg, nodes, edges]);

	async function onSelectedBuildingChange(bldCode: string): Promise<void> {
		setSelectedBuilding(bldCode);

		//await getIndoorMapData(bldCode);
		fetch("/data/indoors/ist/istF1_noNodes.svg")
			.then((response) => response.text())
			.then((text) => setSvg(text))
			.then(() => {
				setNodes([
					{ id: "1", name: "Node 1", type: "room", x: 100, y: 250 },
					{ id: "2", name: "Node 2", type: "hallway", x: 200, y: 150 },
					{ id: "3", name: "Node 3", type: "room", x: 300, y: 200 }
				]);

				setEdges([
					{ id: "1-2", sourceNodeId: "1", targetNodeId: "2" },
					{ id: "2-3", sourceNodeId: "2", targetNodeId: "3" }
				]);
			});
	}

	async function getBuildings(): Promise<void> {
		try {
			const response: GetBuildingsResponse = await api.get("/api/building/allNamesAndCodes");

			setBuildings(response.buildings);
		} catch (error) {
			console.error("Error fetching buildings:", error);
		}
	}

	async function getIndoorMapData(bldCode: string): Promise<void> {
		setMapLoaded(false);

		try {
			const response: GetIndoorMapResponse = await api.get(`/api/building/${bldCode}/map`);

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
			id: `${Date.now()}`,
			name: `Node ${nodes!.length + 1}`,
			type: nodeType,
			x,
			y
		};

		setNodes((prevNodes) => [...prevNodes!, newNode]);
		setChangesMade(true);
	}

	function nodesHaveConnection(nodeA: Node, nodeB: Node): boolean {
		return edges!.some(
			(edge) =>
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

	function deleteNode(nodeId: string): void {
		setNodes((prevNodes) => prevNodes!.filter((node) => node.id !== nodeId));
		setEdges((prevEdges) => prevEdges!.filter((edge) => edge.sourceNodeId !== nodeId && edge.targetNodeId !== nodeId));
		setSelectedNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setSelectedEdge((prevEdge) =>
			prevEdge && (prevEdge.sourceNodeId === nodeId || prevEdge.targetNodeId === nodeId) ? null : prevEdge
		);
		setSelectedNodesAndEdges(
			(prevSelection) =>
				new Set(
					Array.from(prevSelection).filter((item) => {
						if (isNode(item)) return item.id !== nodeId;
						if (isEdge(item)) return !(item.sourceNodeId === nodeId || item.targetNodeId === nodeId);
						return true;
					})
				)
		);
		setHoveredNode((prevNode) => (prevNode?.id === nodeId ? null : prevNode));
		setChangesMade(true);
	}

	function deleteEdge(nodeIdA: string, nodeIdB: string): void {
		setEdges((prevEdges) =>
			prevEdges!.filter(
				(edge) =>
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
		setSelectedNode((prevNode) => prevNode && (prevNode.id === nodeIdA || prevNode.id === nodeIdB ? null : prevNode));
		setSelectedNodesAndEdges(
			(prevSelection) =>
				new Set(
					Array.from(prevSelection).filter((item) => {
						if (isNode(item)) return item.id !== nodeIdA && item.id !== nodeIdB;
						if (isEdge(item)) {
							const matchesEdge =
								(item.sourceNodeId === nodeIdA && item.targetNodeId === nodeIdB) ||
								(item.sourceNodeId === nodeIdB && item.targetNodeId === nodeIdA);
							return !matchesEdge;
						}
						return true;
					})
				)
		);
		setHoveredNode((prevNode) => (prevNode && (prevNode.id === nodeIdA || prevNode.id === nodeIdB) ? null : prevNode));
		setChangesMade(true);
	}

	function discardChanges(): void {
		console.log("Discarding changes...");
		// TODO: Implement the logic to discard changes and revert to the last saved state
		setChangesMade(false);
		setDiscardPending(false);
	}

	function saveChanges(): void {
		console.log("Saving changes...");
		// TODO: Implement the logic to save changes to the database
		setChangesMade(false);
		setSavePending(false);
	}

	return (
		<>
			<div className="header-row">
				<div className="selector-container">
					<p>Select a building to edit:</p>
					<select
						value={selectedBuilding || ""}
						onChange={(e) => onSelectedBuildingChange(e.target.value)}
						disabled={changesMade}
					>
						<option value="" disabled>
							-- Select a building --
						</option>
						{buildings.map((building) => (
							<option key={building.code} value={building.code}>
								{building.name} ({building.code})
							</option>
						))}
					</select>
				</div>

				{selectedTool === Tool.CreateNode && (
					<div className="selector-container">
						<p>Node type to create:</p>
						<select value={nodeTypeToCreate} onChange={(e) => setNodeTypeToCreate(e.target.value)}>
							<option value="room">Room</option>
							<option value="room-door">Room Door</option>
							<option value="hallway">Hallway</option>
							<option value="stairs">Staircase</option>
							<option value="elevator">Elevator</option>
						</select>
					</div>
				)}

				<div className="save-discard-buttons">
					<button
						onClick={() => {
							setDiscardPending(true);
						}}
						disabled={!changesMade}
						className="discard"
					>
						Discard
					</button>

					<button
						onClick={() => {
							setSavePending(true);
						}}
						disabled={!changesMade}
						className="save"
					>
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
									moveNode={() => undefined}
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

					{/* Contextual information about the selected or hovered node/edge */}
					{(hoveredNode || selectedNode || selectedEdge) && (
						<IndoorGraphContextComponent
							node={hoveredNode || selectedNode || null}
							edge={selectedEdge && !(hoveredNode || selectedNode) ? selectedEdge : null}
							deleteNode={deleteNode}
							deleteEdge={deleteEdge}
						/>
					)}

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
		</>
	);
}
