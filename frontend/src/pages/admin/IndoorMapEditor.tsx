import React, { useEffect, useRef, useState } from "react";
import ConfirmationModal from "../../components/ConfirmationModal";
import EdgeComponent, { type Edge } from "../../components/EdgeComponent";
import IndoorMapEditorToolbar, { Tool } from "../../components/IndoorMapEditorToolbar";
import NodeComponent, { type Node } from "../../components/NodeComponent";
import SvgViewerComponent, { type SvgViewerHandle } from "../../components/SvgViewerComponent";
import api from "../../api";
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

	const svgViewerRef = useRef<SvgViewerHandle>(null);

	const [buildings, setBuildings] = useState<Building[]>([]);
	const [selectedBuilding, setSelectedBuilding] = useState<string | null>(null);
	const [mapLoaded, setMapLoaded] = useState(false);
	const [svg, setSvg] = useState<string | null>(null);
	const [nodes, setNodes] = useState<Node[] | null>(null);
	const [edges, setEdges] = useState<Edge[] | null>(null);
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
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

	function onMapClick(coordinates: { x: number; y: number } | null): void {
		if (selectedTool === Tool.CreateNode && coordinates) createNode(coordinates.x, coordinates.y, nodeTypeToCreate);
	}

	function onNodeClick(node: Node): void {
		switch (selectedTool) {
			case Tool.SingleSelect:
				handleNodeClickSelectTool(node);
				break;
			case Tool.Connect:
				handleNodeClickConnectTool(node);
				break;
		}
	}

	function handleNodeClickSelectTool(node: Node): void {
		if (selectedNode === node) setSelectedNode(null);
		else setSelectedNode(node);
	}

	function handleNodeClickConnectTool(node: Node): void {
		if (selectedNode === null) return setSelectedNode(node);

		if (selectedNode.id === node.id) return setSelectedNode(null);

		if (!nodesHaveConnection(selectedNode, node)) makeConnection(selectedNode, node);
		setSelectedNode(null);
	}

	function onEdgeClick(edge: Edge): void {
		setSelectedEdge(edge);
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
						<select
							value={nodeTypeToCreate}
							onChange={(e) => setNodeTypeToCreate(e.target.value)}
						>
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

			{mapLoaded && (
				<div className="editor">
					<div className="map">
						<SvgViewerComponent
							ref={svgViewerRef}
							svg={svg!}
							allowPan={selectedTool !== Tool.CreateNode}
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
										isSelected={selectedEdge?.id === edge.id}
										onEdgeClick={onEdgeClick}
									/>
								);
							})}

							{nodes!.map((node) => (
								<NodeComponent
									key={node.id}
									node={node}
									isSelected={selectedNode?.id === node.id}
									onNodeClick={onNodeClick}
									setHoveredNode={onHoveredNodeChange}
								/>
							))}
						</SvgViewerComponent>
					</div>

					<div className="toolbar">
						<IndoorMapEditorToolbar
							selectedTool={selectedTool}
							setSelectedTool={setSelectedTool}
							zoomStep={svgViewerZoomStep}
							onZoomIn={onZoomInButtonClicked}
							onZoomOut={onZoomOutButtonClicked}
						/>
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
		</>
	);
}
