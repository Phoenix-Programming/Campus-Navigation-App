import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import ConfirmSaveDiscardModals from "@features/indoor-map-editor/components/ConfirmSaveDiscardModals";

describe("ConfirmSaveDiscardModals", () => {
	it("fires the save and discard callbacks from their modal actions", () => {
		const onSaveClose = vi.fn();
		const onSaveConfirm = vi.fn();
		const onDiscardClose = vi.fn();
		const onDiscardConfirm = vi.fn();
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root: Root = createRoot(container);

		act(() => {
			root.render(
				<ConfirmSaveDiscardModals
					savePending={true}
					discardPending={true}
					onSaveClose={onSaveClose}
					onSaveConfirm={onSaveConfirm}
					onDiscardClose={onDiscardClose}
					onDiscardConfirm={onDiscardConfirm}
				/>
			);
		});

		const buttons = Array.from(container.querySelectorAll("button"));
		expect(buttons.length).toBeGreaterThan(0);

		act(() => {
			buttons[buttons.length - 1].click();
		});
		expect(onDiscardConfirm).toHaveBeenCalledTimes(1);

		act(() => {
			root.unmount();
		});
		document.body.removeChild(container);
	});
});
