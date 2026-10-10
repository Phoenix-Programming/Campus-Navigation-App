import axios, { type AxiosError, type AxiosHeaders, type AxiosInstance, type InternalAxiosRequestConfig } from "axios";
import { getAccessToken, refreshAuthTokens } from "@features/auth/utils/session";

const api: AxiosInstance = axios.create({
	baseURL: import.meta.env.VITE_API_URL
});

interface AuthenticatedRequestConfig extends InternalAxiosRequestConfig {
	_hasAuthHeader?: boolean;
	_skipAuthRefresh?: boolean;
	_retry?: boolean;
}

function isPublicAuthEndpoint(url: string | undefined): boolean {
	if (!url) return false;

	return [
		"/api/users/login",
		"/api/users/register",
		"/api/users/refresh",
		"/api/users/forgot-password",
		"/api/users/reset-password"
	].some((path) => url.includes(path));
}

function setAuthorizationHeader(headers: InternalAxiosRequestConfig["headers"], token: string): void {
	if (typeof (headers as AxiosHeaders).set === "function") {
		(headers as AxiosHeaders).set("Authorization", `Bearer ${token}`);
		return;
	}

	(headers as Record<string, string | undefined>).Authorization = `Bearer ${token}`;
}

api.interceptors.request.use((config: AuthenticatedRequestConfig) => {
	config._skipAuthRefresh = isPublicAuthEndpoint(config.url);

	const accessToken = getAccessToken();

	if (accessToken && !config._skipAuthRefresh) {
		config.headers = config.headers ?? {};
		setAuthorizationHeader(config.headers, accessToken);
		config._hasAuthHeader = true;
	}

	return config;
});

api.interceptors.response.use(
	(response) => response,
	async (error: AxiosError) => {
		const originalRequest = error.config as AuthenticatedRequestConfig | undefined;

		if (
			!originalRequest ||
			error.response?.status !== 401 ||
			originalRequest._retry ||
			originalRequest._skipAuthRefresh ||
			!originalRequest._hasAuthHeader
		) {
			return Promise.reject(error);
		}

		originalRequest._retry = true;

		const refreshedTokens = await refreshAuthTokens();

		if (!refreshedTokens) return Promise.reject(error);

		originalRequest.headers = originalRequest.headers ?? {};
		setAuthorizationHeader(originalRequest.headers, refreshedTokens.access_token);

		return api.request(originalRequest);
	}
);

export default api;
