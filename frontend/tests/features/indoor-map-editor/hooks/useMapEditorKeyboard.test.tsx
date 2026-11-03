import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useMapEditorKeyboard } from "@features/indoor-map-editor/hooks/useMapEditorKeyboard";
import type { Edge, Node } from "@features/indoor-map-editor/models/buildings_models";
import { Tool } from "@features/indoor-map-editor/models/indoor_map_editor_models";

function renderHook<T>(callback: () => T): { current: () => T; unmount: () => void } {
	let currentValue!: T;
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root: Root = createRoot(container);

	function HookHarness(): null {
		currentValue = callback();
		return null;
	}

	act(() => {
		root.render(<HookHarness />);
	});

	return {
		current: () => currentValue,
		unmount: () => {
			act(() => {
				root.unmount();
			});
			document.body.removeChild(container);
		}
	};
}

describe("useMapEditorKeyboard", () => {
	it("finalizes a clickable area when Enter is pressed while editing", () => {
		const finalizeClickableArea = vi.fn();
		const hook = renderHook(() =>
			useMapEditorKeyboard({
				selectedNode: null,
				selectedEdge: null,
				selectedNodesAndEdges: new Set<Node | Edge>(),
				showCreateBuildingModal: false,
				showEditBuildingModal: false,
				savePending: false,
				discardPending: false,
				nodes: [],
				edges: [],
				selectedTool: Tool.EditClickableArea,
				clickableAreaEditingNodeId: 9,
				clickableAreaDraftPoints: [],
				deleteSelectedItems: vi.fn(),
				cancelClickableAreaEdit: vi.fn(),
				finalizeClickableArea
			})
		);

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
		});

		expect(finalizeClickableArea).toHaveBeenCalledTimes(1);
		hook.unmount();
	});

	it("deletes the current selection when Backspace is pressed", () => {
		const deleteSelectedItems = vi.fn();
		const selectedNode: Node = { id: 4, label: "Selected", type: "room", x: 5, y: 5, clickable_area: null };
		const hook = renderHook(() =>
			useMapEditorKeyboard({
				selectedNode,
				selectedEdge: null,
				selectedNodesAndEdges: new Set<Node | Edge>(),
				showCreateBuildingModal: false,
				showEditBuildingModal: false,
				savePending: false,
				discardPending: false,
				nodes: [selectedNode],
				edges: [],
				selectedTool: Tool.SingleSelect,
				clickableAreaEditingNodeId: null,
				clickableAreaDraftPoints: [],
				deleteSelectedItems,
				cancelClickableAreaEdit: vi.fn(),
				finalizeClickableArea: vi.fn()
			})
		);

		act(() => {
			window.dispatchEvent(new KeyboardEvent("keydown", { key: "Backspace", bubbles: true }));
		});

		expect(deleteSelectedItems).toHaveBeenCalledTimes(1);
		hook.unmount();
	});
});
