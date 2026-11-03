import React from "react";
import { type Node, type Edge } from "../models/buildings_models";
import "../styles/inspector-panel.scss";
import IndoorGraphContextComponent from "./IndoorGraphContextComponent";
import { isNode } from "./NodeComponent";
import { isEdge } from "./EdgeComponent";

interface InspectorPanelProps {
	selectedNode: Node | null;
	selectedEdge: Edge | null;
	selectedNodesAndEdges: Set<Node | Edge>;
	hoveredNode: Node | null;
	hoveredEdge: Edge | null;
	updateNode?: (nodeId: number, newLabel: string | null, newType: string | null) => void;
	deleteNode?: (nodeId: number) => void;
	deleteEdge?: (nodeAId: number, nodeBId: number) => void;
}

export default function InspectorPanel({
	selectedNode,
	selectedEdge,
	selectedNodesAndEdges,
	hoveredNode,
	hoveredEdge,
	updateNode,
	deleteNode,
	deleteEdge
}: InspectorPanelProps): React.JSX.Element {
	return (
		<div className="context-overlays">
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

			{(selectedNode || selectedEdge || selectedNodesAndEdges.size > 0) && (
				<IndoorGraphContextComponent
					nodes={
						selectedNode ?
						[selectedNode] : (
							selectedNodesAndEdges.size > 0 ?
							Array.from(selectedNodesAndEdges).filter(isNode) : []
						)
					}
					edges={
						selectedEdge ?
						[selectedEdge] : (
							selectedNodesAndEdges.size > 0 ?
							Array.from(selectedNodesAndEdges).filter(isEdge): []
						)
					}
					isHovered={false}
					updateNode={updateNode}
					deleteNode={deleteNode}
					deleteEdge={deleteEdge}
				/>
			)}
		</div>
	);
}
