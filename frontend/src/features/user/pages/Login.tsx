import { useRef, type JSX } from "react";
import api from "@shared/api/api";
import { storeAuthTokens } from "@features/auth/utils/session";
import { showError, showSuccess, showWarning } from "@features/notifications/services/notifications";

export default function LoginPage(): JSX.Element {
	const loginFormRef = useRef<HTMLFormElement>(null);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginUser();
	};

	const loginUser = async () => {
		try {
			const form: HTMLFormElement = loginFormRef.current!;
			const formData: FormData = new FormData(form);
			const username: string = String(formData.get("username") ?? "").trim();
			const password: string = String(formData.get("password") ?? "").trim();

			if (!username || !password) {
				showWarning("Please enter both your username and password.", "Missing Login Details");
				return;
			}

			const response = await api.post(`/api/users/login`, formData, {
				validateStatus: function (_) { return true; }
			});

			if (response.status === 200) {
				showSuccess("Welcome back!", "Login Successful!");
				storeAuthTokens(response.data);
				return;
			}

			if (response.status === 401) {
				console.warn("Login failed: Invalid credentials");
				showWarning("Please try again.", "Incorrect Username or Password");
				return;
			}
		} catch (error) {
			console.error("Error logging in:", error);
			showError(error instanceof Error ? error.message : "Unable to log in right now.", "Login Failed");
		}
	};

	return (
		<section>
			<h2>Login</h2>

			<form onSubmit={handleSubmit} ref={loginFormRef}>
				<input type="text" placeholder="Username or Email" name="username" />
				<input type="password" placeholder="Password" name="password" />
				<button type="submit">Login</button>
			</form>
		</section>
	);
}
