import { useRef, type JSX } from "react";
import api from "../api";


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
				email: emailInputRef.current?.value,
				username: usernameInputRef.current?.value,
				password: passwordInputRef.current?.value,
			};
			console.log("Registering user with data:", data);

			const response = await api.post(`/api/users/register`, data);

			if (response.status === 201) {
				alert("User registered successfully!");
			} else {
				alert("Failed to register user.");
			}
		} catch (error) {
			console.error("Error registering user:", error);
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
