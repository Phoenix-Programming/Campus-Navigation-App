import { redirect } from "react-router";
import { hasAdminAccess } from "../features/auth/utils/adminAccess";
import { clearAuthTokens, getRefreshToken, refreshAuthTokens } from "../features/auth/utils/session";

/**
 * Protects a route that is restricted to admins
 */
export async function adminRoute(): Promise<null> {
	const token: string | null = localStorage.getItem("access_token");

	if (hasAdminAccess(token)) return null;

	if (getRefreshToken()) {
		const refreshedTokens = await refreshAuthTokens();

		if (refreshedTokens && hasAdminAccess(refreshedTokens.access_token)) {
			return null;
		}
	}

	try {
		clearAuthTokens();
	} catch (error) {
		//ignore storage cleanup failures and redirect below
	}

	throw redirect("/unauthorized");
}
