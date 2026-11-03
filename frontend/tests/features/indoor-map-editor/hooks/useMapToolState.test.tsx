import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useMapToolState } from "@features/indoor-map-editor/hooks/useMapToolState";
import type { Edge, Node } from "@features/indoor-map-editor/models/buildings_models";
import { ClickableAreaTool, Tool } from "@features/indoor-map-editor/models/indoor_map_editor_models";

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

describe("useMapToolState", () => {
	it("switches tools and forwards the new tool to the page state setter", () => {
		const setSelectedTool = vi.fn();
		const selectedNode = { id: 2, label: "B", type: "room", x: 20, y: 20, clickable_area: null } as Node;
		const hook = renderHook(() =>
			useMapToolState({
				selectedTool: Tool.SingleSelect,
				selectedNode,
				selectedEdge: null,
				selectedNodesAndEdges: new Set<Node | Edge>(),
				selectedClickableAreaTool: ClickableAreaTool.SelectNode,
				clickableAreaEditingNodeId: null,
				clickableAreaDraftPoints: [],
				setSelectedTool,
				setSelectedNode: vi.fn(),
				setSelectedEdge: vi.fn(),
				setSelectedNodesAndEdges: vi.fn(),
				setSelectedClickableAreaTool: vi.fn(),
				setClickableAreaEditingNodeId: vi.fn(),
				cancelClickableAreaEdit: vi.fn(),
				primaryModifierLabel: "⌘"
			})
		);

		act(() => {
			hook.current().onSelectedToolChange(Tool.CreateNode);
		});

		expect(setSelectedTool).toHaveBeenCalledWith(Tool.CreateNode);
		hook.unmount();
	});

	it("returns a clickable-area move hint when the editor is active", () => {
		const selectedNode = { id: 2, label: "B", type: "room", x: 20, y: 20, clickable_area: null } as Node;
		const hook = renderHook(() =>
			useMapToolState({
				selectedTool: Tool.EditClickableArea,
				selectedNode,
				selectedEdge: null,
				selectedNodesAndEdges: new Set<Node | Edge>(),
				selectedClickableAreaTool: ClickableAreaTool.MovePoints,
				clickableAreaEditingNodeId: 2,
				clickableAreaDraftPoints: [],
				setSelectedTool: vi.fn(),
				setSelectedNode: vi.fn(),
				setSelectedEdge: vi.fn(),
				setSelectedNodesAndEdges: vi.fn(),
				setSelectedClickableAreaTool: vi.fn(),
				setClickableAreaEditingNodeId: vi.fn(),
				cancelClickableAreaEdit: vi.fn(),
				primaryModifierLabel: "⌘"
			})
		);

		expect(hook.current().getToolHintText()).toMatch(/move/i);
		hook.unmount();
	});
});
