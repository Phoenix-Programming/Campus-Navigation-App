export const AUTH_CHANGE_EVENT = "authchange";

export function notifyAuthChange(): void {
	window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}
