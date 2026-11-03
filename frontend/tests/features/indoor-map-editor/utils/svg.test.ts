import { describe, expect, it } from "vitest";
import { getSvgDimensions, isEditableTarget, normalizeSvgPoint } from "@features/indoor-map-editor/utils/svg";

describe("svg utilities", () => {
	it("reads dimensions from width/height or viewBox attributes", () => {
		expect(getSvgDimensions('<svg width="120" height="80"></svg>')).toEqual({ width: 120, height: 80 });
		expect(getSvgDimensions('<svg viewBox="0 0 200 150"></svg>')).toEqual({ width: 200, height: 150 });
		expect(getSvgDimensions(null)).toEqual({ width: 100, height: 100 });
	});

	it("detects editable inputs and clamps coordinate values", () => {
		const input = document.createElement("input");
		const textarea = document.createElement("textarea");
		const div = document.createElement("div");

		expect(isEditableTarget(input)).toBe(true);
		expect(isEditableTarget(textarea)).toBe(true);
		expect(isEditableTarget(div)).toBe(false);
		expect(normalizeSvgPoint({ x: 300, y: -10 }, { width: 100, height: 100 })).toEqual({ x: 100, y: 0 });
	});
});
