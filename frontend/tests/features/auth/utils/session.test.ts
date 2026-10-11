import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearAuthTokens,
	getAccessToken,
	getRefreshToken,
	isAccessTokenExpired,
	refreshAuthTokens,
	storeAuthTokens
} from "@features/auth/utils/session";

function encodeJwtPayload(payload: Record<string, unknown>): string {
	const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

	return `header.${encodedPayload}.signature`;
}

describe("auth session utilities", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.unstubAllGlobals();
	});

	it("stores and clears auth tokens", () => {
		storeAuthTokens({ access_token: "abc", refresh_token: "def", token_type: "bearer" });

		expect(getAccessToken()).toBe("abc");
		expect(getRefreshToken()).toBe("def");

		clearAuthTokens();

		expect(getAccessToken()).toBeNull();
		expect(getRefreshToken()).toBeNull();
	});

	it("detects expired and valid access tokens", () => {
		const validToken = encodeJwtPayload({ exp: Math.floor(Date.now() / 1000) + 60 });
		const expiredToken = encodeJwtPayload({ exp: Math.floor(Date.now() / 1000) - 60 });

		expect(isAccessTokenExpired(null)).toBe(true);
		expect(isAccessTokenExpired(validToken)).toBe(false);
		expect(isAccessTokenExpired(expiredToken)).toBe(true);
		expect(isAccessTokenExpired("not-a-token")).toBe(true);
	});

	it("returns null when no refresh token is available", async () => {
		await expect(refreshAuthTokens()).resolves.toBeNull();
	});

	it("refreshes auth tokens when the refresh token is valid", async () => {
		storeAuthTokens({ access_token: "old-access", refresh_token: "refresh-token", token_type: "bearer" });

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				json: async () => ({ access_token: "new-access", refresh_token: "new-refresh", token_type: "bearer" })
			})
		);

		await expect(refreshAuthTokens()).resolves.toEqual({
			access_token: "new-access",
			refresh_token: "new-refresh",
			token_type: "bearer"
		});
		expect(getAccessToken()).toBe("new-access");
		expect(getRefreshToken()).toBe("new-refresh");
	});

	it("clears auth tokens when an invalid refresh response is returned", async () => {
		storeAuthTokens({ access_token: "old-access", refresh_token: "refresh-token", token_type: "bearer" });

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({})
			})
		);

		await expect(refreshAuthTokens()).resolves.toBeNull();
		expect(getAccessToken()).toBeNull();
		expect(getRefreshToken()).toBeNull();
	});
});
