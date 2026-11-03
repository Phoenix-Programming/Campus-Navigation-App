import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useClickableAreaEditor } from "@features/indoor-map-editor/hooks/useClickableAreaEditor";
import type { Node } from "@features/indoor-map-editor/models/buildings_models";
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

describe("useClickableAreaEditor", () => {
	it("finalizes a clickable area and persists it onto the node", () => {
		const initialNode: Node = { id: 1, label: "A", type: "room", x: 10, y: 20, clickable_area: null };
		let nextNodes: Node[] = [initialNode];
		const setNodes = vi.fn((updater) => {
			nextNodes = typeof updater === "function" ? updater(nextNodes) : updater;
		});
		const onSelectedNodeChange = vi.fn();
		const hook = renderHook(() =>
			useClickableAreaEditor({
				nodes: nextNodes,
				setNodes,
				selectedNode: initialNode,
				selectedTool: Tool.EditClickableArea,
				svgDimensions: { width: 100, height: 100 },
				setChangesMade: vi.fn(),
				mapContainerRef: { current: null },
				onSelectedNodeChange,
				onCreateNode: vi.fn()
			})
		);

		act(() => {
			hook.current().setClickableAreaEditingNodeId(1);
			hook.current().setClickableAreaDraftPoints([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 10, y: 10 }
			]);
		});

		act(() => {
			hook.current().finalizeClickableArea();
		});

		expect(nextNodes[0].clickable_area).toEqual([
			{ x: 0, y: 0 },
			{ x: 10, y: 0 },
			{ x: 10, y: 10 }
		]);
		expect(onSelectedNodeChange).toHaveBeenCalled();
		hook.unmount();
	});

	it("captures draft points for a new clickable area on map clicks", () => {
		const node: Node = { id: 2, label: "B", type: "room", x: 30, y: 40, clickable_area: null };
		const hook = renderHook(() =>
			useClickableAreaEditor({
				nodes: [node],
				setNodes: vi.fn(),
				selectedNode: node,
				selectedTool: Tool.EditClickableArea,
				svgDimensions: { width: 100, height: 100 },
				setChangesMade: vi.fn(),
				mapContainerRef: { current: null },
				onSelectedNodeChange: vi.fn(),
				onCreateNode: vi.fn()
			})
		);

		act(() => {
			hook.current().setClickableAreaEditingNodeId(2);
			hook.current().setSelectedClickableAreaTool(0);
		});

		act(() => {
			hook.current().onMapClick({ x: 12, y: 34 });
		});

		expect(hook.current().clickableAreaDraftPoints).toEqual([{ x: 12, y: 34 }]);
		hook.unmount();
	});
});
