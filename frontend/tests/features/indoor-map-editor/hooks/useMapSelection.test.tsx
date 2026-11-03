import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useMapSelection } from "@features/indoor-map-editor/hooks/useMapSelection";
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

describe("useMapSelection", () => {
	it("toggles a single node selection in single-select mode", () => {
		const node: Node = { id: 1, label: "A", type: "room", x: 10, y: 20, clickable_area: null };
		const hook = renderHook(() =>
			useMapSelection({
				nodes: [node],
				edges: [],
				selectedTool: Tool.SingleSelect,
				setChangesMade: vi.fn(),
				makeConnection: vi.fn(),
				deleteEdge: vi.fn(),
				nodesHaveConnection: vi.fn(() => false)
			})
		);

		act(() => {
			hook.current().onNodeClick(node);
		});
		expect(hook.current().selectedNode).toEqual(node);

		act(() => {
			hook.current().onNodeClick(node);
		});
		expect(hook.current().selectedNode).toBeNull();

		hook.unmount();
	});

	it("creates a connection when the single-connect tool selects a new node", () => {
		const nodes: Node[] = [
			{ id: 1, label: "A", type: "room", x: 10, y: 10, clickable_area: null },
			{ id: 2, label: "B", type: "room", x: 20, y: 20, clickable_area: null }
		];
		const makeConnection = vi.fn();
		const deleteEdge = vi.fn();
		const hook = renderHook(() =>
			useMapSelection({
				nodes,
				edges: [],
				selectedTool: Tool.SingleConnect,
				setChangesMade: vi.fn(),
				makeConnection,
				deleteEdge,
				nodesHaveConnection: vi.fn(() => false)
			})
		);

		act(() => {
			hook.current().onNodeClick(nodes[0]);
		});
		act(() => {
			hook.current().onNodeClick(nodes[1]);
		});

		expect(makeConnection).toHaveBeenCalledWith(nodes[0], nodes[1]);
		hook.unmount();
	});

	it("removes a connection when the single-connect tool selects an already connected node", () => {
		const nodes: Node[] = [
			{ id: 1, label: "A", type: "room", x: 10, y: 10, clickable_area: null },
			{ id: 2, label: "B", type: "room", x: 20, y: 20, clickable_area: null }
		];
		const edges: Edge[] = [{ id: "1-2", source_node_id: 1, target_node_id: 2 }];
		const makeConnection = vi.fn();
		const deleteEdge = vi.fn();
		const hook = renderHook(() =>
			useMapSelection({
				nodes,
				edges,
				selectedTool: Tool.SingleConnect,
				setChangesMade: vi.fn(),
				makeConnection,
				deleteEdge,
				nodesHaveConnection: (nodeA, nodeB) =>
					edges.some(
						(edge) =>
							(edge.source_node_id === nodeA.id && edge.target_node_id === nodeB.id) ||
							(edge.source_node_id === nodeB.id && edge.target_node_id === nodeA.id)
					)
			})
		);

		act(() => {
			hook.current().onNodeClick(nodes[0]);
		});
		act(() => {
			hook.current().onNodeClick(nodes[1]);
		});

		expect(deleteEdge).toHaveBeenCalledWith(1, 2);
		hook.unmount();
	});
});
