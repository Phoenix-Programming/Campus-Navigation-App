import { beforeEach, describe, expect, it, vi } from "vitest";
import * as buildingsApi from "@features/indoor-map-editor/api/buildings.api";
import {
	buildFloorSvgCreatePayload,
	buildFloorSvgUpdatePayload,
	buildIndoorMapGraphDownloadPayload,
	createBuilding,
	getBuildingCategoryTypes,
	getBuildingData,
	getBuildings,
	getFloorSvgForFloor,
	getIndoorMapData,
	getLiveGraphFloors,
	isRecord,
	normalizeFloorSvgData,
	normalizeUploadedGraphPayload,
	parseFiniteNumber,
	sanitizeBuildingCodeForFileName,
	updateBuilding,
	updateIndoorMap
} from "@features/indoor-map-editor/services/indoor_map_editor.service";

vi.mock("@features/indoor-map-editor/api/buildings.api", () => ({
	getBuildings: vi.fn(),
	getIndoorMapData: vi.fn(),
	updateIndoorMap: vi.fn(),
	getBuildingCategoryTypes: vi.fn(),
	getBuildingData: vi.fn(),
	updateBuilding: vi.fn(),
	createBuilding: vi.fn()
}));

describe("indoor map editor service helpers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("detects record-like values and finite numbers", () => {
		expect(isRecord({ ok: true })).toBe(true);
		expect(isRecord(null)).toBe(false);
		expect(isRecord([])).toBe(false);
		expect(parseFiniteNumber("42", "x")).toBe(42);
		expect(() => parseFiniteNumber("nope", "x")).toThrow("valid number");
	});

	it("normalizes floor svg data from array and object formats", () => {
		const normalizedFromArray = normalizeFloorSvgData(["<svg>1</svg>", "", "<svg>3</svg>"], 3);
		const normalizedFromObject = normalizeFloorSvgData(
			{ 1: "<svg>1</svg>", 3: "<svg>3</svg>", 0: "<svg>skip</svg>" },
			3
		);

		expect(normalizedFromArray).toEqual({
			1: "<svg>1</svg>",
			3: "<svg>3</svg>"
		});
		expect(normalizedFromObject).toEqual({ 1: "<svg>1</svg>", 2: "<svg>1</svg>", 3: "<svg>3</svg>" });
	});

	it("returns an empty svg when a floor is missing", () => {
		expect(getFloorSvgForFloor({ 1: "<svg>1</svg>" }, 2)).toBe("");
	});

	it("builds create and update payloads around changed floors", () => {
		const createPayload = buildFloorSvgCreatePayload({ 1: "<svg>1</svg>", 3: "<svg>3</svg>" }, 4);
		const updatePayload = buildFloorSvgUpdatePayload(
			{ 1: "<svg>1</svg>", 2: "<svg>old</svg>" },
			{ 1: "<svg>1</svg>", 2: "<svg>new</svg>", 3: "<svg>3</svg>" },
			2,
			3
		);
		const noChangePayload = buildFloorSvgUpdatePayload({ 1: "<svg>1</svg>" }, { 1: "<svg>1</svg>" }, 1, 1);
		const noUploadPayload = buildFloorSvgCreatePayload({ 2: "" }, 3);

		expect(createPayload).toEqual(["<svg>1</svg>", null, "<svg>3</svg>", null]);
		expect(updatePayload).toEqual([null, "<svg>new</svg>", "<svg>3</svg>"]);
		expect(noChangePayload).toBeNull();
		expect(noUploadPayload).toBeNull();
	});

	it("normalizes uploaded graph payloads to the selected floor and building", () => {
		const normalized = normalizeUploadedGraphPayload(
			{
				graph: {
					bld_code: "B1",
					floor_num: 2,
					nodes: [{ id: "A", label: "Room A", x: 1, y: 2 }],
					edges: [{ sourceNodeId: "A", targetNodeId: "A" }]
				}
			},
			2,
			"B1"
		);

		expect(normalized).toEqual({
			nodes: [{ id: 1, label: "Room A", type: "room", x: 1, y: 2 }],
			edges: [{ id: "1", source_node_id: 1, target_node_id: 1 }]
		});
	});

	it("rejects malformed uploaded graph payloads with helpful errors", () => {
		expect(() =>
			normalizeUploadedGraphPayload({ graph: { bld_code: "B2", floor_num: 2, nodes: [], edges: [] } }, 2, "B1")
		).toThrow("This graph file is for building B2");
		expect(() =>
			normalizeUploadedGraphPayload({ graph: { bld_code: "B1", floor_num: 3, nodes: [], edges: [] } }, 2, "B1")
		).toThrow("This graph file is for floor 3");
		expect(() =>
			normalizeUploadedGraphPayload({ graph: { bld_code: "B1", floor_num: 2, nodes: null, edges: [] } }, 2, "B1")
		).toThrow("must include a nodes array");
		expect(() =>
			normalizeUploadedGraphPayload({ graph: { bld_code: "B1", floor_num: 2, nodes: [], edges: null } }, 2, "B1")
		).toThrow("must include an edges array");
		expect(() =>
			normalizeUploadedGraphPayload(
				{
					graph: {
						bld_code: "B1",
						floor_num: 2,
						nodes: [{ id: "A", x: 1, y: 2 }],
						edges: [{ source_node_id: "A", target_node_id: "Z" }]
					}
				},
				2,
				"B1"
			)
		).toThrow("Each edge must reference node ids");
	});

	it("returns a sanitized building filename segment and builds graph download payloads", () => {
		expect(sanitizeBuildingCodeForFileName(" B 1 / East ")).toBe("B-1---East");
		expect(sanitizeBuildingCodeForFileName("   ")).toBe("unknown");
		const payload = buildIndoorMapGraphDownloadPayload("B1", 2, {
			svg: "<svg />",
			nodes: [{ id: 1, label: "Room", type: "room", x: 5, y: 6 }],
			edges: [{ id: "1-2", source_node_id: 1, target_node_id: 2 }]
		});

		expect(payload).toEqual({
			bld_code: "B1",
			floor_num: 2,
			nodes: [{ id: 1, label: "Room", type: "room", x: 5, y: 6 }],
			edges: [{ id: "1-2", source_node_id: 1, target_node_id: 2 }]
		});
	});

	it("detects which floors have live graph data", async () => {
		vi.mocked(buildingsApi.getIndoorMapData)
			.mockResolvedValueOnce({ svg: "<svg />", nodes: [], edges: [] })
			.mockResolvedValueOnce({ svg: "<svg />", nodes: [{ id: 1, label: "Room", type: "room", x: 1, y: 2 }], edges: [] })
			.mockResolvedValueOnce({
				svg: "<svg />",
				nodes: [],
				edges: [{ id: "1-2", source_node_id: 1, target_node_id: 2 }]
			});

		await expect(getLiveGraphFloors("B1", 3)).resolves.toEqual(new Set([2, 3]));
	});

	it("wraps API calls for building and map operations with sensible defaults", async () => {
		vi.mocked(buildingsApi.getBuildings).mockResolvedValue([{ id: 1, name: "North Hall", code: "NH", num_floors: 3 }]);
		vi.mocked(buildingsApi.getIndoorMapData).mockResolvedValueOnce({ svg: "<svg />", nodes: [], edges: [] });
		vi.mocked(buildingsApi.getBuildingCategoryTypes).mockResolvedValue(["Academic"]);
		vi.mocked(buildingsApi.getBuildingData).mockResolvedValueOnce({
			category_type: "academic",
			name: "North Hall",
			code: "NH",
			address: "123 Main St",
			num_floors: 2,
			floor_svgs: ["<svg />"]
		});
		vi.mocked(buildingsApi.updateBuilding).mockResolvedValue(undefined);
		vi.mocked(buildingsApi.createBuilding).mockResolvedValue(undefined);
		vi.mocked(buildingsApi.updateIndoorMap).mockResolvedValue(undefined);

		await expect(getBuildings()).resolves.toEqual([{ id: 1, name: "North Hall", code: "NH", num_floors: 3 }]);
		await expect(getIndoorMapData("B1", 2)).resolves.toEqual({ svg: "<svg />", nodes: [], edges: [] });
		await expect(getBuildingCategoryTypes()).resolves.toEqual(["Academic"]);
		await expect(getBuildingData(1)).resolves.toEqual({
			category_type: "academic",
			name: "North Hall",
			code: "NH",
			address: "123 Main St",
			num_floors: 2,
			floor_svgs: ["<svg />"]
		});

		vi.mocked(buildingsApi.getBuildingData).mockResolvedValue(null as never);
		await expect(getBuildingData(99)).resolves.toEqual({
			category_type: "",
			name: "",
			code: "",
			address: "",
			num_floors: 0,
			floor_svgs: []
		});
		await updateIndoorMap("B1", 2, [{ id: 1, label: "Room", type: "room", x: 1, y: 2 }], []);
		await updateBuilding(1, "academic", "North Hall", "NH", "123 Main St", 2, ["<svg />"]);
		await createBuilding("academic", "North Hall", "NH", "123 Main St", 2, ["<svg />"]);

		expect(buildingsApi.updateIndoorMap).toHaveBeenCalledWith(
			"B1",
			2,
			[{ id: 1, label: "Room", type: "room", x: 1, y: 2 }],
			[]
		);
		expect(buildingsApi.updateBuilding).toHaveBeenCalledWith(1, "academic", "North Hall", "NH", "123 Main St", 2, [
			"<svg />"
		]);
		expect(buildingsApi.createBuilding).toHaveBeenCalledWith("academic", "North Hall", "NH", "123 Main St", 2, [
			"<svg />"
		]);
	});
});
