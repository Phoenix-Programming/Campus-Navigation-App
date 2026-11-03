import { useEffect } from "react";
import { type Node, type Edge } from "../models/buildings_models";
import { Tool } from "../models/indoor_map_editor_models";
import { isEditableTarget } from "../utils/svg";

interface UseMapEditorKeyboardArgs {
	selectedNode: Node | null;
	selectedEdge: Edge | null;
	selectedNodesAndEdges: Set<Node | Edge>;
	showCreateBuildingModal: boolean;
	showEditBuildingModal: boolean;
	savePending: boolean;
	discardPending: boolean;
	nodes: Node[] | null;
	edges: Edge[] | null;
	selectedTool: Tool;
	clickableAreaEditingNodeId: number | null;
	clickableAreaDraftPoints: Array<{ x: number; y: number }>;
	deleteSelectedItems: () => void;
	cancelClickableAreaEdit: () => void;
	finalizeClickableArea: () => void;
}

export function useMapEditorKeyboard({
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
}: UseMapEditorKeyboardArgs): void {
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
		clickableAreaDraftPoints,
		deleteSelectedItems,
		cancelClickableAreaEdit,
		finalizeClickableArea
	]);
}
