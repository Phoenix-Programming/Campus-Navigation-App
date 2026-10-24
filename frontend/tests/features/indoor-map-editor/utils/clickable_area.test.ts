import { describe, expect, it } from "vitest";
import { buildClickableAreaPoints, canFinalizeClickableArea } from "@features/indoor-map-editor/utils/clickable_area";

describe("clickable area utilities", () => {
	it("builds polygon strings including the live cursor point while drafting", () => {
		const points = [
			{ x: 10, y: 20 },
			{ x: 30, y: 25 },
			{ x: 15, y: 40 }
		];

		expect(buildClickableAreaPoints(points, { x: 22, y: 35 })).toBe("10,20 30,25 15,40 22,35");
	});

	it("requires at least three points before finalizing a polygon", () => {
		expect(
			canFinalizeClickableArea([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 },
				{ x: 0, y: 10 }
			])
		).toBe(true);
		expect(
			canFinalizeClickableArea([
				{ x: 0, y: 0 },
				{ x: 10, y: 0 }
			])
		).toBe(false);
	});
});
