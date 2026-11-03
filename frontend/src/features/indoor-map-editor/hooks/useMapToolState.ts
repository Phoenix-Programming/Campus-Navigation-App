import { useCallback } from "react";
import { type Edge, type Node } from "../models/buildings_models";
import { ClickableAreaTool, Tool } from "../models/indoor_map_editor_models";

interface UseMapToolStateArgs {
	selectedTool: Tool;
	selectedNode: Node | null;
	selectedEdge: Edge | null;
	selectedNodesAndEdges: Set<Node | Edge>;
	selectedClickableAreaTool: ClickableAreaTool;
	clickableAreaEditingNodeId: number | null;
	clickableAreaDraftPoints: Array<{ x: number; y: number }>;
	setSelectedTool: (tool: Tool) => void;
	setSelectedNode: (node: Node | null) => void;
	setSelectedEdge: (edge: Edge | null) => void;
	setSelectedNodesAndEdges: (next: Set<Node | Edge>) => void;
	setSelectedClickableAreaTool: (tool: ClickableAreaTool) => void;
	setClickableAreaEditingNodeId: (nodeId: number | null) => void;
	cancelClickableAreaEdit: () => void;
	primaryModifierLabel: string;
}

export function useMapToolState({
	selectedTool,
	selectedNode,
	selectedEdge,
	selectedNodesAndEdges,
	selectedClickableAreaTool,
	clickableAreaEditingNodeId,
	clickableAreaDraftPoints,
	setSelectedTool,
	setSelectedNode,
	setSelectedEdge,
	setSelectedNodesAndEdges,
	setSelectedClickableAreaTool,
	setClickableAreaEditingNodeId,
	cancelClickableAreaEdit,
	primaryModifierLabel
}: UseMapToolStateArgs) {
	const onSelectedToolChange = useCallback(
		(tool: Tool): void => {
			if (tool === selectedTool) return;

			if (selectedTool === Tool.EditClickableArea) {
				cancelClickableAreaEdit();
				setClickableAreaEditingNodeId(null);
				setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
			}

			setSelectedTool(tool);

			switch (tool) {
				case Tool.SingleSelect:
					if (selectedNodesAndEdges.size === 1) {
						const firstItem = Array.from(selectedNodesAndEdges)[0];
						if (firstItem && "id" in firstItem) {
							if ((firstItem as Node).x !== undefined) setSelectedNode(firstItem as Node);
							else setSelectedEdge(firstItem as Edge);
						}
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
						if (firstItem && "x" in firstItem) setSelectedNode(firstItem as Node);
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
						const firstItem = Array.from(selectedNodesAndEdges)[0];
						if (firstItem && "x" in firstItem) setSelectedNode(firstItem as Node);
					}
					setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
					if (selectedNode) setClickableAreaEditingNodeId(selectedNode.id);
					setSelectedEdge(null);
					setSelectedNodesAndEdges(new Set<Node | Edge>());
					cancelClickableAreaEdit();
					break;
			}
		},
		[
			cancelClickableAreaEdit,
			selectedClickableAreaTool,
			selectedEdge,
			selectedNode,
			selectedNodesAndEdges,
			selectedTool,
			setClickableAreaEditingNodeId,
			setSelectedClickableAreaTool,
			setSelectedEdge,
			setSelectedNode,
			setSelectedNodesAndEdges,
			setSelectedTool
		]
	);

	const getToolHintText = useCallback((): string | null => {
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
				const numDraftPoints = clickableAreaDraftPoints.length;
				return (
					(numDraftPoints < 3
						? "Click to designate the corners of the clickable area"
						: "Press Enter to finalize the clickable area") + (numDraftPoints > 0 ? " | Press Esc to cancel" : "")
				);
			default:
				return null;
		}
	}, [
		clickableAreaDraftPoints.length,
		primaryModifierLabel,
		selectedClickableAreaTool,
		selectedEdge,
		selectedNode,
		selectedNodesAndEdges.size,
		selectedTool
	]);

	return {
		onSelectedToolChange,
		getToolHintText
	};
}
