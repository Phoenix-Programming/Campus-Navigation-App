import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@shared/api/api";
import { showError, showSuccess } from "@features/notifications/services/notifications.service";
import {
	createBuilding,
	getBuildingCategoryTypes,
	getBuildingData,
	getBuildings,
	getIndoorMapData,
	updateBuilding,
	updateIndoorMap
} from "@features/indoor-map-editor/api/buildings.api";

vi.mock("@shared/api/api", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn(),
		patch: vi.fn()
	}
}));

vi.mock("@features/notifications/services/notifications.service", () => ({
	showError: vi.fn(),
	showSuccess: vi.fn()
}));

describe("buildings api", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches the building list from the API", async () => {
		const buildings = [{ id: 1, name: "North Hall", code: "NH", num_floors: 3 }];
		vi.mocked(api.get).mockResolvedValue({ data: { buildings } } as never);

		await expect(getBuildings()).resolves.toEqual(buildings);
		expect(api.get).toHaveBeenCalledWith("/api/buildings");
	});

	it("returns an empty list when the building list request fails", async () => {
		vi.mocked(api.get).mockRejectedValue(new Error("Request failed"));

		await expect(getBuildings()).resolves.toEqual([]);
		expect(showError).toHaveBeenCalledWith("Request failed", "Failed to Load Building List");
	});

	it("fetches indoor map data for a building floor", async () => {
		const mapData = { svg: "<svg />", nodes: [{ id: 1, label: "Room", type: "room", x: 1, y: 2 }], edges: [] };
		vi.mocked(api.get).mockResolvedValue({ data: mapData } as never);

		await expect(getIndoorMapData("B1", 2)).resolves.toEqual(mapData);
		expect(api.get).toHaveBeenCalledWith("/api/buildings/map", {
			params: { bld_code: "B1", floor_num: 2 }
		});
	});

	it("returns null and surfaces an error when the indoor map request fails", async () => {
		vi.mocked(api.get).mockRejectedValue(new Error("Map failed"));

		await expect(getIndoorMapData("B1", 2)).resolves.toBeNull();
		expect(showError).toHaveBeenCalledWith("Map failed", "Failed to Load Indoor Map");
	});

	it("saves an indoor map update through the API and shows success", async () => {
		vi.mocked(api.post).mockResolvedValue(undefined);
		const nodes = [{ id: 1, label: "Room", type: "room", x: 10, y: 20 }];
		const edges = [{ id: "1-2", source_node_id: 1, target_node_id: 2 }];

		await updateIndoorMap("B1", 2, nodes, edges);

		expect(api.post).toHaveBeenCalledWith("/api/buildings/map", {
			bld_code: "B1",
			floor_num: 2,
			nodes,
			edges
		});
		expect(showSuccess).toHaveBeenCalledWith("Indoor map saved successfully.", "Successfully Saved Indoor Map");
	});

	it("shows an error notification when saving the indoor map fails", async () => {
		vi.mocked(api.post).mockRejectedValue(new Error("Save failed"));

		await updateIndoorMap("B1", 2, [], []);

		expect(showError).toHaveBeenCalledWith("Save failed", "Failed to Save Indoor Map");
	});

	it("returns building category types from the API", async () => {
		vi.mocked(api.get).mockResolvedValue({ data: ["Academic"] } as never);

		await expect(getBuildingCategoryTypes()).resolves.toEqual(["Academic"]);
	});

	it("returns null when category types are unavailable", async () => {
		vi.mocked(api.get).mockResolvedValue({ data: null } as never);

		await expect(getBuildingCategoryTypes()).resolves.toBeNull();
	});

	it("loads building data for the requested building", async () => {
		const buildingData = {
			category_type: "academic",
			name: "North Hall",
			code: "NH",
			address: "123 Campus Ave",
			num_floors: 2,
			floor_svgs: ["<svg />", "<svg />"]
		};
		vi.mocked(api.get).mockResolvedValue({ data: buildingData } as never);

		await expect(getBuildingData(1)).resolves.toEqual(buildingData);
		expect(api.get).toHaveBeenCalledWith("/api/buildings/1");
	});

	it("returns null when building data is absent", async () => {
		vi.mocked(api.get).mockResolvedValue({ data: null } as never);

		await expect(getBuildingData(2)).resolves.toBeNull();
	});

	it("updates an existing building through the API", async () => {
		vi.mocked(api.patch).mockResolvedValue(undefined);

		await updateBuilding(5, "academic", "North Hall", "NH", "123 Main St", 3, ["<svg />", null]);

		expect(api.patch).toHaveBeenCalledWith("/api/buildings/5", {
			category_type: "academic",
			name: "North Hall",
			code: "NH",
			address: "123 Main St",
			num_floors: 3,
			floor_svgs: ["<svg />", null]
		});
	});

	it("creates a building through the API", async () => {
		vi.mocked(api.post).mockResolvedValue(undefined);

		await createBuilding("academic", "North Hall", "NH", "123 Main St", 3, ["<svg />", null]);

		expect(api.post).toHaveBeenCalledWith("/api/buildings", {
			category_type: "academic",
			name: "North Hall",
			code: "NH",
			address: "123 Main St",
			num_floors: 3,
			floor_svgs: ["<svg />", null]
		});
	});
});
