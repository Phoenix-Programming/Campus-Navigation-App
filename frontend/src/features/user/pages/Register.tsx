import { useRef, type JSX } from "react";
import api from "@shared/api/api";
import { showError, showSuccess, showWarning } from "@features/notifications/services/notifications";

export default function RegisterPage(): JSX.Element {
	const emailInputRef = useRef<HTMLInputElement>(null);
	const usernameInputRef = useRef<HTMLInputElement>(null);
	const passwordInputRef = useRef<HTMLInputElement>(null);

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		registerUser();
	};

	const registerUser = async () => {
		try {
			const data = {
				email: emailInputRef.current?.value?.trim(),
				username: usernameInputRef.current?.value?.trim(),
				password: passwordInputRef.current?.value
			};

			if (!data.email || !data.username || !data.password || data.password.length < 8) {
				showWarning(
					"Please enter a valid email, username, and a password with at least 8 characters.",
					"Incomplete Registration Form"
				);
				return;
			}

			const response = await api.post(`/api/users/register`, data);

			if (response.status === 201) {
				showSuccess("Registration successful.", "Account Created");
				return;
			}

			showError("Registration could not be completed.", "Registration Failed");
		} catch (error) {
			console.error("Error registering user:", error);
			showError(error instanceof Error ? error.message : "Registration failed.", "Account Creation Error");
		}
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
