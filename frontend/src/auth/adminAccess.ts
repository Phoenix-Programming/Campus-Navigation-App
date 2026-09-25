import { jwtDecode, type JwtPayload } from "jwt-decode";
import { getAccessToken } from "./session";

interface AdminTokenPayload extends JwtPayload {
	role?: string;
}

export function hasAdminAccess(token: string | null = getAccessToken()): boolean {
	if (!token) return false;

	try {
		const decoded = jwtDecode<AdminTokenPayload>(token);
		const currentTime = Date.now() / 1000;

		return decoded.role === "admin" && (!decoded.exp || decoded.exp >= currentTime);
	} catch {
		return false;
	}
}
