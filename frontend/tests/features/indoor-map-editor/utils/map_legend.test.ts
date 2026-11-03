import { describe, expect, it } from "vitest";
import { MAP_KEY_ITEMS } from "@features/indoor-map-editor/utils/map_legend";

describe("map legend utility", () => {
	it("exports the labels and css classes used by the legend", () => {
		expect(MAP_KEY_ITEMS).toHaveLength(9);
		expect(MAP_KEY_ITEMS[0]).toMatchObject({ label: "Room", className: "room" });
		expect(MAP_KEY_ITEMS.at(-1)).toMatchObject({ label: "Connection", className: "connection" });
	});
});
