import React from "react";
import { NodeType, type Node } from "./NodeComponent";
import { type Edge } from "./EdgeComponent";
import deleteIcon from "@assets/icons/delete.svg";
import "@styles/components/indoor-graph-context-component.scss";

interface IndoorGraphContextProps {
	nodes: Node[];
	edges: Edge[];
	isHovered: boolean;
	updateNode?: (nodeId: number, newLabel: string | null, newType: string | null) => void;
	deleteNode?: (nodeId: number) => void;
	deleteEdge?: (nodeAId: number, nodeBId: number) => void;
}

export default function IndoorGraphContextComponent({
	nodes,
	edges,
	isHovered,
	updateNode,
	deleteNode,
	deleteEdge
}: IndoorGraphContextProps): React.JSX.Element | null {
	const isSingleNode: boolean = nodes.length === 1 && edges.length === 0;
	const isSingleEdge: boolean = edges.length === 1 && nodes.length === 0;
	const isMultipleSelection: boolean = nodes.length + edges.length > 1;

	if (!isSingleNode && !isSingleEdge && !isMultipleSelection) return null;

	const node: Node | null = isSingleNode ? nodes[0] : null;
	const edge: Edge | null = isSingleEdge ? edges[0] : null;

	function setSelectedNodeType(newType: string): void {
		updateNode!(node!.id, null, newType);
	}

	function setSelectedNodeLabel(newLabel: string): void {
		updateNode!(node!.id, newLabel, null);
	}

	function getTitle(): string {
		if (!isMultipleSelection) return `${isHovered ? "Hovered" : "Selected"} ${isSingleNode ? "Node" : "Edge"}`;

		const nodePart: string = nodes.length > 0 ? `${nodes.length} Node${nodes.length > 1 ? "s" : ""}` : "";
		const edgePart: string = edges.length > 0 ? `${edges.length} Edge${edges.length > 1 ? "s" : ""}` : "";
		const parts: string[] = [nodePart, edgePart].filter((part) => part !== "");

		return `${parts.join(" and ")} Selected`;
	}

	function getContent(): React.JSX.Element | null {
		if (isSingleNode && node !== null) return getSingleNodeContent();
		if (isSingleEdge && edge !== null) return getSingleEdgeContent();

		return null;
	}

	function getSingleNodeContent(): React.JSX.Element {
		return (
			<>
				<span>ID: {node!.id}</span>

				{isHovered ? (
					<>
						<span>Label: {node!.label}</span>
						<span className="capitalize">Type: {node!.type}</span>
					</>
				) : (
					<>
						<div className="kv-pair">
							<span>Label:</span>

							<input
								value={node!.label}
								onChange={(e) => setSelectedNodeLabel(e.target.value)}
								placeholder="Enter label (optional)"
								style={{ height: "24px" }}
							/>
						</div>

						<div className="kv-pair">
							<span>Type:</span>

							<select
								value={node?.type}
								onChange={(e) => setSelectedNodeType(e.target.value)}
								style={{ height: "24px" }}
							>
								{Object.values(NodeType).map((type) => (
									<option key={type} value={type}>
										{type.charAt(0).toUpperCase() + type.slice(1)}
									</option>
								))}
							</select>
						</div>
					</>
				)}

				<span>
					Coordinates: ({Number(node!.x.toFixed(3))}, {Number(node!.y.toFixed(3))})
				</span>
			</>
		);
	}

	function getSingleEdgeContent(): React.JSX.Element {
		return (
			<>
				<span>ID: {edge!.id}</span>
				<span>Source Node ID: {edge!.source_node_id}</span>
				<span>Target Node ID: {edge!.target_node_id}</span>
			</>
		);
	}

	function getDeleteLabel(): string {
		if (isSingleNode) return "Delete Node";
		if (isSingleEdge) return "Delete Edge";

		return "Delete Selected Items";
	}

	function onDeleteButtonClicked(): void {
		if (isSingleNode) return deleteNode!(node!.id);
		if (isSingleEdge) return deleteEdge!(edge!.source_node_id, edge!.target_node_id);

		nodes.forEach((node) => deleteNode!(node.id));
		edges.forEach((edge) => deleteEdge!(edge.source_node_id, edge.target_node_id));
	}

	return (
		<div className="context-overlay">
			<div className="context-container">
				<span className="title">{getTitle()}</span>

				{getContent()}

				{/* Delete Button */}
				{!isHovered && (
					<button
						type="button"
						className="delete-button"
						onClick={onDeleteButtonClicked}
						aria-label={getDeleteLabel()}
						title={getDeleteLabel()}
					>
						<img src={deleteIcon} alt="" />
					</button>
				)}
			</div>
		</div>
	);
}
