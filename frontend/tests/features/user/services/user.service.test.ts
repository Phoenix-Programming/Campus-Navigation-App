import { beforeEach, describe, expect, it, vi } from "vitest";
import * as session from "@features/auth/utils/session.utils";
import * as userApi from "@features/user/api/user.api";
import { getUser, loginUser, registerUser } from "@features/user/services/user.service";

vi.mock("@features/auth/utils/session.utils", () => ({
	storeAuthTokens: vi.fn()
}));

vi.mock("@features/user/api/user.api", () => ({
	getUser: vi.fn(),
	loginUser: vi.fn(),
	registerUser: vi.fn()
}));

describe("user service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("delegates fetching a user to the API", async () => {
		const user = { id: 3, username: "alice", email: "alice@example.com" };
		vi.mocked(userApi.getUser).mockResolvedValue(user);

		await expect(getUser(3)).resolves.toEqual(user);
		expect(userApi.getUser).toHaveBeenCalledWith(3);
	});

	it("stores auth tokens and returns true when login succeeds", async () => {
		const authTokens = { access_token: "token", refresh_token: "refresh", token_type: "bearer" };
		vi.mocked(userApi.loginUser).mockResolvedValue(authTokens);

		await expect(loginUser("alice", "secret")).resolves.toBe(true);
		expect(userApi.loginUser).toHaveBeenCalledWith("alice", "secret");
		expect(session.storeAuthTokens).toHaveBeenCalledWith(authTokens);
	});

	it("returns false when login does not return a payload", async () => {
		vi.mocked(userApi.loginUser).mockResolvedValue(null);

		await expect(loginUser("alice", "wrong")).resolves.toBe(false);
		expect(session.storeAuthTokens).not.toHaveBeenCalled();
	});

	it("delegates registration to the API", async () => {
		const response = { id: 9, username: "marketing", email: "marketing@example.com" };
		vi.mocked(userApi.registerUser).mockResolvedValue(response);

		await expect(registerUser("marketing@example.com", "marketing", "pass")).resolves.toBe(true);
		expect(userApi.registerUser).toHaveBeenCalledWith("marketing@example.com", "marketing", "pass");
	});

	it("returns false when registration fails", async () => {
		vi.mocked(userApi.registerUser).mockResolvedValue(null);

		await expect(registerUser("bad@example.com", "bad-user", "bad-pass")).resolves.toBe(false);
	});
});
