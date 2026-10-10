import { useRef, type JSX } from "react";
import { registerUser as registerUserService } from "../api/user_api";
import { showWarning } from "@features/notifications/services/notifications";


export default function RegisterPage(): JSX.Element {
	const emailInputRef = useRef<HTMLInputElement>(null);
	const usernameInputRef = useRef<HTMLInputElement>(null);
	const passwordInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		registerUser();
	};

	const registerUser = async () => {
		const email = emailInputRef.current?.value?.trim();
		const username = usernameInputRef.current?.value?.trim();
		const password = passwordInputRef.current?.value;

		if (!email || !username || !password || password.length < 8) {
			showWarning(
				"Please enter a valid email, username, and a password with at least 8 characters.",
				"Incomplete Registration Form"
			);
			return;
		}

		await registerUserService(email, username, password);
	};


	return (
		<section>
			<h2>Register</h2>
			<p>Remember that the password needs to be at least 8 characters.</p>

			<form onSubmit={handleSubmit}>
				<input type="email" placeholder="Email" ref={emailInputRef} />
				<input type="text" placeholder="Username" ref={usernameInputRef} />
				<input type="password" placeholder="Password" ref={passwordInputRef} />
				<button type="submit">Register</button>
			</form>
		</section>
	);
}
