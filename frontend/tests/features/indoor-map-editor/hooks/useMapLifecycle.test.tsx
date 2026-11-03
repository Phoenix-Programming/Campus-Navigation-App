import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import { useMapLifecycle } from "@features/indoor-map-editor/hooks/useMapLifecycle";
import * as indoorMapEditorService from "@features/indoor-map-editor/services/indoor_map_editor.service";

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

describe("useMapLifecycle", () => {
	it("loads building records and marks the map as loaded once data is available", async () => {
		vi.spyOn(indoorMapEditorService, "getBuildings").mockResolvedValue([
			{ id: 1, name: "Main", code: "MAIN", num_floors: 2 }
		]);
		vi.spyOn(indoorMapEditorService, "getIndoorMapData").mockResolvedValue({
			svg: '<svg width="100" height="100"></svg>',
			nodes: [{ id: 1, label: "A", type: "room", x: 10, y: 10, clickable_area: null }],
			edges: []
		});

		const hook = renderHook(() => useMapLifecycle());

		await act(async () => {
			await hook.current().getBuildings();
			await hook.current().loadMapData("MAIN", 1);
		});

		expect(hook.current().buildings).toHaveLength(1);
		expect(hook.current().mapLoaded).toBe(true);
		expect(hook.current().svg).toContain("<svg");
		hook.unmount();
	});
});
