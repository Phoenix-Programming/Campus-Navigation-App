import { storeAuthTokens } from "@features/auth/utils/session";
import { getUser as getUserApi, loginUser as loginUserApi, registerUser as registerUserApi } from "../api/user_api";
import type { LoginUserResponse, PrivateUserData, PublicUserData } from "../models/user_models";

export async function getUser(user_id: number): Promise<PublicUserData | null> {
	return await getUserApi(user_id);
}

export async function loginUser(username: string, password: string): Promise<boolean> {
	const response: LoginUserResponse | null = await loginUserApi(username, password);

	if (response) storeAuthTokens(response);

	return response !== null;
}

export async function registerUser(email: string, username: string, password: string): Promise<boolean> {
	const response: PrivateUserData | null = await registerUserApi(email, username, password);

	return response !== null;
}
