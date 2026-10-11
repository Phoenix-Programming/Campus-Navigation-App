import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "@shared/api/api";
import { showError, showSuccess, showWarning } from "@features/notifications/services/notifications.service";
import { getUser, loginUser, registerUser } from "@features/user/api/user.api";

vi.mock("@shared/api/api", () => ({
	default: {
		get: vi.fn(),
		post: vi.fn()
	}
}));

vi.mock("@features/notifications/services/notifications.service", () => ({
	showError: vi.fn(),
	showSuccess: vi.fn(),
	showWarning: vi.fn()
}));

describe("user api", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("fetches a user by id", async () => {
		const user = { id: 1, username: "alicia", email: "alicia@example.com" };
		vi.mocked(api.get).mockResolvedValue({ data: user } as never);

		await expect(getUser(1)).resolves.toEqual(user);
		expect(api.get).toHaveBeenCalledWith("/api/users/1");
	});

	it("returns null and shows an error when fetching the user fails", async () => {
		vi.mocked(api.get).mockRejectedValue(new Error("User fetch failed"));

		await expect(getUser(7)).resolves.toBeNull();
		expect(showError).toHaveBeenCalledWith("User fetch failed", "Failed to Load User Data");
	});

	it("logs a user in successfully", async () => {
		const authTokens = { access_token: "abc", refresh_token: "def", token_type: "bearer" };
		vi.mocked(api.post).mockResolvedValue({ status: 200, data: authTokens } as never);

		await expect(loginUser("alicia", "secret")).resolves.toEqual(authTokens);
		expect(api.post).toHaveBeenCalledWith(
			"/api/users/login",
			{ username: "alicia", password: "secret" },
			{ validateStatus: expect.any(Function) }
		);
		expect(showSuccess).toHaveBeenCalledWith("Welcome back!", "Login Successful!");
	});

	it("returns null and warns when the login credentials are invalid", async () => {
		vi.mocked(api.post).mockResolvedValue({ status: 401, data: {} } as never);

		await expect(loginUser("bad-user", "bad-pass")).resolves.toBeNull();
		expect(showWarning).toHaveBeenCalledWith("Please try again.", "Incorrect Username or Password");
	});

	it("returns null and shows an error on unexpected login responses", async () => {
		vi.mocked(api.post).mockResolvedValue({ status: 500, data: {} } as never);

		await expect(loginUser("alicia", "secret")).resolves.toBeNull();
		expect(showError).toHaveBeenCalledWith("Unexpected response status: 500", "Login Failed");
	});

	it("registers a new user successfully", async () => {
		const createdUser = { id: 2, username: "new-user", email: "new@example.com" };
		vi.mocked(api.post).mockResolvedValue({ status: 201, data: createdUser } as never);

		await expect(registerUser("new@example.com", "new-user", "secret")).resolves.toEqual(createdUser);
		expect(api.post).toHaveBeenCalledWith("/api/users/register", {
			email: "new@example.com",
			username: "new-user",
			password: "secret"
		});
		expect(showSuccess).toHaveBeenCalledWith("Registration successful.", "Account Created");
	});

	it("returns null and shows an error when registration fails", async () => {
		vi.mocked(api.post).mockRejectedValue(new Error("Registration failed"));

		await expect(registerUser("bad@example.com", "bad-user", "bad-pass")).resolves.toBeNull();
		expect(showError).toHaveBeenCalledWith("Registration failed", "Account Creation Error");
	});
});
