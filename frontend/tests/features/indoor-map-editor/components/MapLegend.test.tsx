import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it } from "vitest";
import MapLegend from "@features/indoor-map-editor/components/MapLegend";
import { MAP_KEY_ITEMS } from "@features/indoor-map-editor/utils/map_legend";

describe("MapLegend", () => {
	it("renders the key title and known legend items", () => {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root: Root = createRoot(container);

		act(() => {
			root.render(<MapLegend items={MAP_KEY_ITEMS.slice(0, 3)} />);
		});

		expect(container.textContent).toContain("Key");
		expect(container.textContent).toContain("Room");
		expect(container.textContent).toContain("Room Door");
		expect(container.querySelector("img")?.getAttribute("class")).toContain("key-icon");

		act(() => {
			root.unmount();
		});
		document.body.removeChild(container);
	});
});
