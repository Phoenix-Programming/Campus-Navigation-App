import type { AxiosResponse } from "axios";
import api from "@shared/api/api";
import type {
	GetUserResponse,
	LoginUserRequest,
	LoginUserResponse,
	RegisterUserRequest,
	RegisterUserResponse
} from "../models/user_models";
import { showError, showSuccess, showWarning } from "@features/notifications/services/notifications";

export async function getUser(user_id: number): Promise<GetUserResponse | null> {
	try {
		const response: AxiosResponse<GetUserResponse> = await api.get(`/api/users/${user_id}`);

		return response.data as GetUserResponse;
	} catch (error) {
		console.error("Error fetching user:", error);
		showError(error instanceof Error ? error.message : "The user could not be loaded.", "Failed to Load User Data");

		return null;
	}
}

export async function loginUser(username: string, password: string): Promise<LoginUserResponse | null> {
	try {
		const request: LoginUserRequest = { username, password };

		const response: AxiosResponse<LoginUserResponse> = await api.post(`/api/users/login`, request, {
			validateStatus: function (_) {
				return true;
			}
		});

		if (response.status === 200) {
			console.log(`${username} logged in successfully`);
			showSuccess("Welcome back!", "Login Successful!");
			return response.data as LoginUserResponse;
		}

		if (response.status === 401) {
			console.warn("Login failed: Invalid credentials");
			showWarning("Please try again.", "Incorrect Username or Password");
			return null;
		}

		throw new Error(`Unexpected response status: ${response.status}`);
	} catch (error) {
		console.error("Error logging in:", error);
		showError(error instanceof Error ? error.message : "Unable to log in right now.", "Login Failed");

		return null;
	}
}

export async function registerUser(
	email: string,
	username: string,
	password: string
): Promise<RegisterUserResponse | null> {
	try {
		const request: RegisterUserRequest = { email, username, password };

		const response: AxiosResponse<RegisterUserResponse> = await api.post(`/api/users/register`, request);

		if (response.status === 201) {
			showSuccess("Registration successful.", "Account Created");
			return response.data as RegisterUserResponse;
		}

		throw new Error(`Unexpected response status: ${response.status}`);
	} catch (error) {
		console.error("Error registering user:", error);
		showError(error instanceof Error ? error.message : "Registration failed.", "Account Creation Error");
		return null;
	}
}
