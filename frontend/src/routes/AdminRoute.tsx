import { redirect } from "react-router";
import { jwtDecode, type JwtPayload } from "jwt-decode";

interface AdminTokenPayload extends JwtPayload {
	role?: string;
}

/**
 * Protects a route that is restricted to admins
 */
export async function adminRoute() {
	const token = localStorage.getItem("access_token");

	if (!token) {
		//no token found, redirect to unauthorized page
		throw redirect("/unauthorized");
	}

	try {
		//decode the JWT to read the payload
		const decoded = jwtDecode<AdminTokenPayload>(token);

		//check if the token is expired
		const currentTime = Date.now() / 1000;
		if (decoded.exp && decoded.exp < currentTime) {
			localStorage.removeItem("access_token"); // clear expired token

			//redirect to unauthorized page
			throw redirect("/unauthorized");
		}

		//check if the user has the admin role
		const isAdmin = decoded.role === "admin";

		if (!isAdmin) throw redirect("/unauthorized");
	} catch (error) {
		//token is invalid or decoding fails
		localStorage.removeItem("access_token");

		//redirect to unauthorized page
		throw redirect("/unauthorized");
	}

	return null;
}
