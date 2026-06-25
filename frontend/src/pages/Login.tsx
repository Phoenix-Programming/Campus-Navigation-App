import { useRef, type JSX } from "react";
import api from "../api";

export default function LoginPage(): JSX.Element {
	const loginFormRef = useRef<HTMLFormElement>(null);


	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginUser();
	};


	const loginUser = async () => {
		try {
			const data = new FormData(loginFormRef.current!);

			console.log("Logging in with data:", data);
			const response = await api.post(`/api/users/login`, data);

			console.log("Login response:", response);

			if (response.status === 200) {
				alert("Login successful!");

				localStorage.setItem('access_token', response.data.access_token)
				localStorage.setItem('refresh_token', response.data.access_token)
			} else {
				alert("Failed to login.");
			}
		} catch (error) {
			console.error("Error logging in:", error);
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
