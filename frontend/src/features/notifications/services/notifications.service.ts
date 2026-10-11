import { useEffect, useState } from "react";


export type NotificationType = "info" | "warning" | "error" | "success";


export interface NotificationOptions {
	type: NotificationType;
	title?: string;
	message: string;
	durationMs?: number;
}


export interface NotificationItem extends NotificationOptions {
	id: string;
	createdAt: number;
	durationMs: number;
}


export interface NotificationManagerOptions {
	maxVisibleNotifications?: number;
	defaultDurationMs?: number;
}


type NotificationListener = (notifications: NotificationItem[]) => void;


const DEFAULT_MAX_VISIBLE_NOTIFICATIONS: number = 4;
const DEFAULT_DURATION_MS: number = 5000;


function createId(): string {
	if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();

	return `notification-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


function getDefaultTitle(type: NotificationType): string {
	switch (type) {
		case "info": return "Information";
		case "warning": return "Warning";
		case "error": return "Error";
		case "success": return "Success";
		default: return "Notification";
	}
}


export function createNotification({
	type,
	title,
	message,
	durationMs = DEFAULT_DURATION_MS
}: NotificationOptions): NotificationItem {
	return {
		id: createId(),
		type,
		title: title ?? getDefaultTitle(type),
		message,
		durationMs,
		createdAt: Date.now()
	};
}


export class NotificationManager {
	private readonly listeners: Set<NotificationListener> = new Set<NotificationListener>();
	private readonly timers: Map<string, ReturnType<typeof setTimeout>> = new Map<string, ReturnType<typeof setTimeout>>();
	private readonly maxVisibleNotifications: number;
	private readonly defaultDurationMs: number;
	private notifications: NotificationItem[] = [];

	constructor(options: NotificationManagerOptions | number = DEFAULT_MAX_VISIBLE_NOTIFICATIONS) {
		const resolvedOptions: NotificationManagerOptions =
			typeof options === "number" ? { maxVisibleNotifications: options } : options;

		this.maxVisibleNotifications = resolvedOptions.maxVisibleNotifications ?? DEFAULT_MAX_VISIBLE_NOTIFICATIONS;
		this.defaultDurationMs = resolvedOptions.defaultDurationMs ?? DEFAULT_DURATION_MS;
	}

	public subscribe(listener: NotificationListener): () => void {
		this.listeners.add(listener);
		listener(this.getNotifications());

		return () => { this.listeners.delete(listener); };
	}

	public getNotifications(): NotificationItem[] {
		return [...this.notifications];
	}

	public add(options: NotificationOptions): string {
		const notification: NotificationItem = createNotification({
			...options,
			durationMs: options.durationMs ?? this.defaultDurationMs
		});

		this.notifications = [...this.notifications, notification].slice(-this.maxVisibleNotifications);
		this.emit();
		this.scheduleAutoDismiss(notification.id, notification.durationMs);

		return notification.id;
	}

	public dismiss(id: string): void {
		const timer: ReturnType<typeof setTimeout> | undefined = this.timers.get(id);

		if (timer) {
			clearTimeout(timer);
			this.timers.delete(id);
		}

		this.notifications = this.notifications.filter((notification) => notification.id !== id);
		this.emit();
	}

	public clear(): void {
		for (const timer of this.timers.values()) clearTimeout(timer);

		this.timers.clear();
		this.notifications = [];
		this.emit();
	}

	private emit(): void {
		for (const listener of this.listeners) listener(this.getNotifications());
	}

	private scheduleAutoDismiss(id: string, durationMs: number): void {
		if (durationMs <= 0) return;

		const timer = setTimeout(() => {
			this.dismiss(id);
		}, durationMs);

		this.timers.set(id, timer);
	}
}

export const notificationManager: NotificationManager = new NotificationManager();


export function notify(options: NotificationOptions): string {
	return notificationManager.add(options);
}


export function showInfo(message: string, title = "Information", durationMs?: number): string {
	return notify({ type: "info", title, message, durationMs });
}


export function showWarning(message: string, title = "Warning", durationMs?: number): string {
	return notify({ type: "warning", title, message, durationMs });
}


export function showError(message: string, title = "Error", durationMs?: number): string {
	return notify({ type: "error", title, message, durationMs });
}


export function showSuccess(message: string, title = "Success", durationMs?: number): string {
	return notify({ type: "success", title, message, durationMs });
}


export function useNotifications(): {
	notifications: NotificationItem[];
	addNotification: (options: NotificationOptions) => string;
	dismiss: (id: string) => void;
	clear: () => void;
	info: typeof showInfo;
	warning: typeof showWarning;
	error: typeof showError;
	success: typeof showSuccess;
} {
	const [notifications, setNotifications] = useState<NotificationItem[]>(() => notificationManager.getNotifications());

	useEffect(() => {
		return notificationManager.subscribe(setNotifications);
	}, []);

	return {
		notifications,
		addNotification: (options: NotificationOptions) => notificationManager.add(options),
		dismiss: (id: string) => notificationManager.dismiss(id),
		clear: () => notificationManager.clear(),
		info: showInfo,
		warning: showWarning,
		error: showError,
		success: showSuccess
	};
}
