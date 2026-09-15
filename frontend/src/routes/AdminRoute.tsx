import { redirect } from "react-router";
import { jwtDecode, type JwtPayload } from "jwt-decode";

interface AdminTokenPayload extends JwtPayload {
	role?: string;
}

/**
 * Protects a route that is restricted to admins
 */
export async function adminRoute(): Promise<null> {
	const token: string | null = localStorage.getItem("access_token");

	//no token found, redirect to unauthorized page
	if (!token) throw redirect("/unauthorized");

	try {
		//decode the JWT to read the payload
		const decoded: AdminTokenPayload = jwtDecode<AdminTokenPayload>(token);

		//check if the token is expired
		const currentTime: number = Date.now() / 1000;
		if (decoded.exp && decoded.exp < currentTime) throw Error("Expired access token");

		//check if the user has the admin role
		const isAdmin: boolean = decoded.role === "admin";

		if (isAdmin) return null;
	} catch (error) {
		//token is invalid or decoding fails
		localStorage.removeItem("access_token");

		//redirect to unauthorized page
		throw redirect("/unauthorized");
	}

	throw redirect("/unauthorized");
}
