import { useRef, type JSX } from "react";
import { loginUser as loginUserService } from "../services/user_service";
import { showWarning } from "@features/notifications/services/notifications";


export default function LoginPage(): JSX.Element {
	const loginFormRef = useRef<HTMLFormElement>(null);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		loginUser();
	};

	const loginUser = async () => {
		const form: HTMLFormElement = loginFormRef.current!;
		const formData: FormData = new FormData(form);
		const username: string = String(formData.get("username") ?? "").trim();
		const password: string = String(formData.get("password") ?? "").trim();

		if (!username || !password) {
			showWarning("Please enter both your username and password.", "Missing Login Details");
			return;
		}

		await loginUserService(username, password);
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
