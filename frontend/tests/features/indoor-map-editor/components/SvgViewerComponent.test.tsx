import React, { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import SvgViewerComponent from "@features/indoor-map-editor/components/SvgViewerComponent";
import { Tool } from "@features/indoor-map-editor/models/indoor_map_editor_models";

describe("SvgViewerComponent", () => {
	it("allows clickable-area clicks to register even while panning is enabled for the edit tool", () => {
		const onMapClick = vi.fn();
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root: Root = createRoot(container);

		act(() => {
			root.render(
				<SvgViewerComponent
					svg='<svg width="100" height="100" viewBox="0 0 100 100"></svg>'
					allowPan={true}
					selectedTool={Tool.EditClickableArea}
					isClickableAreaDraftActive={true}
					onMapClick={onMapClick}
				/>
			);
		});

		const viewer = container.querySelector(".viewer") as HTMLDivElement;
		const img = container.querySelector("img") as HTMLImageElement;

		Object.defineProperty(viewer, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 100 })
		});
		Object.defineProperty(img, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 100 })
		});

		act(() => {
			viewer.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 50, clientY: 50 }));
		});

		expect(onMapClick).toHaveBeenCalledWith({ x: 50, y: 50 });

		act(() => {
			root.unmount();
		});
		document.body.removeChild(container);
	});

	it("suppresses polygon point creation after a drag-to-pan gesture", () => {
		const onMapClick = vi.fn();
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root: Root = createRoot(container);

		act(() => {
			root.render(
				<SvgViewerComponent
					svg='<svg width="100" height="100" viewBox="0 0 100 100"></svg>'
					allowPan={true}
					selectedTool={Tool.EditClickableArea}
					isClickableAreaDraftActive={true}
					onMapClick={onMapClick}
				/>
			);
		});

		const viewer = container.querySelector(".viewer") as HTMLDivElement;
		const img = container.querySelector("img") as HTMLImageElement;

		Object.defineProperty(viewer, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 100 })
		});
		Object.defineProperty(img, "getBoundingClientRect", {
			value: () => ({ left: 0, top: 0, width: 100, height: 100 })
		});

		act(() => {
			viewer.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: 10, clientY: 10 }));
			viewer.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 30, clientY: 30 }));
			viewer.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: 30, clientY: 30 }));
			viewer.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 30, clientY: 30 }));
		});

		expect(onMapClick).not.toHaveBeenCalled();

		act(() => {
			root.unmount();
		});
		document.body.removeChild(container);
	});
});
