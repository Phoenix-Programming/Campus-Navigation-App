import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	createNotification,
	notificationManager,
	NotificationManager,
	showError,
	showInfo,
	showSuccess,
	showWarning,
	useNotifications
} from "@features/notifications/services/notifications.service";

describe("notifications service", () => {
	afterEach(() => {
		notificationManager.clear();
		vi.useRealTimers();
	});

	it("creates a notification with the provided options and default title", () => {
		const notification = createNotification({
			type: "success",
			message: "Saved successfully"
		});

		expect(notification.type).toBe("success");
		expect(notification.title).toBe("Success");
		expect(notification.message).toBe("Saved successfully");
		expect(notification.durationMs).toBe(5000);
	});

	it("uses the default title for unknown notification types", () => {
		const notification = createNotification({
			type: "unknown" as never,
			message: "A fallback title"
		});

		expect(notification.title).toBe("Notification");
	});

	it("adds notifications, dismisses them, and clears the queue", () => {
		const manager = new NotificationManager(2);
		const firstId = manager.add({ type: "info", message: "First" });
		const secondId = manager.add({ type: "warning", message: "Second" });

		expect(manager.getNotifications()).toHaveLength(2);
		expect(manager.getNotifications()[0].message).toBe("First");
		expect(manager.getNotifications()[1].message).toBe("Second");

		manager.dismiss(firstId);
		expect(manager.getNotifications()).toHaveLength(1);
		expect(manager.getNotifications()[0].id).toBe(secondId);

		manager.clear();
		expect(manager.getNotifications()).toHaveLength(0);
	});

	it("subscribes to notification updates and unsubscribes cleanly", () => {
		const manager = new NotificationManager(3);
		const listener = vi.fn();
		const unsubscribe = manager.subscribe(listener);

		expect(listener).toHaveBeenCalledTimes(1);
		manager.add({ type: "info", message: "Hello" });
		expect(listener).toHaveBeenCalledTimes(2);

		unsubscribe();
		manager.add({ type: "warning", message: "Ignored" });
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("auto-dismisses notifications after their configured duration", () => {
		vi.useFakeTimers();
		const manager = new NotificationManager(3);
		manager.add({ type: "error", message: "Oops", durationMs: 15 });

		vi.advanceTimersByTime(20);
		expect(manager.getNotifications()).toHaveLength(0);
	});

	it("skips auto-dismiss when the duration is zero or less", () => {
		vi.useFakeTimers();
		const manager = new NotificationManager({ maxVisibleNotifications: 3, defaultDurationMs: 0 });
		manager.add({ type: "success", message: "No timeout" });

		vi.advanceTimersByTime(1000);
		expect(manager.getNotifications()).toHaveLength(1);
	});

	it("exposes a hook that reflects live notification state", () => {
		const container = document.createElement("div");
		document.body.appendChild(container);
		const root = createRoot(container);
		let hookState: ReturnType<typeof useNotifications> | undefined;

		function TestComponent() {
			hookState = useNotifications();
			return null;
		}

		React.act(() => {
			root.render(React.createElement(TestComponent));
		});

		expect(hookState?.notifications).toEqual([]);

		React.act(() => {
			showInfo("Hook notification", "Hook title");
		});

		expect(hookState?.notifications.some((notification) => notification.message === "Hook notification")).toBe(true);

		React.act(() => {
			hookState?.clear();
		});
		expect(hookState?.notifications).toHaveLength(0);

		root.unmount();
		container.remove();
	});

	it("exposes convenience helpers for notification types", () => {
		const infoId = showInfo("Heads up", "Info Title");
		const warningId = showWarning("Careful", "Warning Title");
		const errorId = showError("Broken", "Error Title");
		const successId = showSuccess("Done", "Success Title");

		expect(typeof infoId).toBe("string");
		expect(typeof warningId).toBe("string");
		expect(typeof errorId).toBe("string");
		expect(typeof successId).toBe("string");
		expect(showInfo).toBeTypeOf("function");
	});
});
