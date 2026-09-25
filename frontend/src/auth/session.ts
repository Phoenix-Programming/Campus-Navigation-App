import { jwtDecode, type JwtPayload } from "jwt-decode";
import { notifyAuthChange } from "./authEvents";

export interface AuthTokenPair {
	access_token: string;
	refresh_token: string;
	token_type: string;
}

const ACCESS_TOKEN_STORAGE_KEY = "access_token";
const REFRESH_TOKEN_STORAGE_KEY = "refresh_token";

let refreshAuthPromise: Promise<AuthTokenPair | null> | null = null;

function getApiUrl(path: string): string {
	const apiBaseUrl: string | undefined = import.meta.env.VITE_API_URL;

	if (!apiBaseUrl) {
		return path;
	}

	return new URL(path, apiBaseUrl).toString();
}

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
	return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function storeAuthTokens(tokens: AuthTokenPair): void {
	localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, tokens.access_token);
	localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
	notifyAuthChange();
}

export function clearAuthTokens(): void {
	localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
	localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
	notifyAuthChange();
}

export function isAccessTokenExpired(token: string | null = getAccessToken()): boolean {
	if (!token) {
		return true;
	}

	try {
		const decoded = jwtDecode<JwtPayload>(token);
		return typeof decoded.exp === "number" && decoded.exp < Date.now() / 1000;
	} catch {
		return true;
	}
}

export async function refreshAuthTokens(): Promise<AuthTokenPair | null> {
	const refreshToken = getRefreshToken();

	if (!refreshToken) {
		return null;
	}

	if (!refreshAuthPromise) {
		refreshAuthPromise = (async () => {
			try {
				const response = await fetch(getApiUrl("/api/users/refresh"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify({ token: refreshToken })
				});

				if (!response.ok) {
					clearAuthTokens();
					return null;
				}

				const tokens = (await response.json()) as AuthTokenPair;
				storeAuthTokens(tokens);
				return tokens;
			} catch {
				clearAuthTokens();
				return null;
			}
		})();

		refreshAuthPromise.finally(() => {
			refreshAuthPromise = null;
		});
	}

	return refreshAuthPromise;
}
