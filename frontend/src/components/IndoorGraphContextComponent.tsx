import React from "react";
import { type Node } from "./NodeComponent";
import { type Edge } from "./EdgeComponent";
import deleteIcon from "@assets/icons/delete.svg";
import "@styles/components/indoor-graph-context-component.scss";

interface IndoorGraphContextProps {
	node: Node | null;
	edge: Edge | null;
	deleteNode: (nodeId: string) => void;
	deleteEdge: (nodeAId: string, nodeBId: string) => void;
}

export default function IndoorGraphContextComponent({
	node,
	edge,
	deleteNode,
	deleteEdge
}: IndoorGraphContextProps): React.JSX.Element | null {
	console.log("IndoorGraphContextComponent: node:", node, "edge:", edge);

	function onDeleteNodeButtonClicked(): void {
		if (node === null) return;
		deleteNode(node.id);
	}

	function onDeleteEdgeButtonClicked(): void {
		if (edge === null) return;
		console.log("Delete edge button clicked for edge:", edge);
		deleteEdge(edge.sourceNodeId, edge.targetNodeId);
	}

	if (node !== null && edge === null)
		return (
			<div className="context-container">
				<span>ID: {node.id}</span>
				<span>Label: {node.name}</span>
				<span>Type: {node.type}</span>
				<span>
					Coordinates: ({node.x.toFixed(3)}, {node.y.toFixed(3)})
				</span>
				<button
					type="button"
					className="delete-button"
					onClick={onDeleteNodeButtonClicked}
					aria-label="Delete Node"
					title="Delete Node"
				>
					<img src={deleteIcon} alt="" />
				</button>
			</div>
		);

	if (edge !== null && node === null)
		return (
			<div className="context-container">
				<span>ID: {edge.id}</span>
				<span>Source Node ID: {edge.sourceNodeId}</span>
				<span>Target Node ID: {edge.targetNodeId}</span>
				<button
					type="button"
					className="delete-button"
					onClick={onDeleteEdgeButtonClicked}
					aria-label="Delete Edge"
					title="Delete Edge"
				>
					<img src={deleteIcon} alt="" />
				</button>
			</div>
		);

	return null;
}
