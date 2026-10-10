import React, { useRef, useState } from "react";
import api from "@shared/api/api";
import { showError } from "@features/notifications/services/notifications";

export default function AccountPage() {
	const userIdInputRef = useRef<HTMLInputElement>(null);
	const [user, setUser] = useState<unknown>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		await getUser(userIdInputRef.current?.valueAsNumber ?? -1);
	};

	const getUser = async (user_id: number) => {
		try {
			const response = await api.get(`/api/users/${user_id}`);

			setUser(response.data);
		} catch (error) {
			console.error("Error fetching user:", error);
			showError(error instanceof Error ? error.message : "The user could not be loaded.", "Failed to Load User Data");
		}
	};

	return (
		<section>
			<form onSubmit={handleSubmit}>
				<input type="number" ref={userIdInputRef} />
				<button type="submit">Get User</button>
			</form>

			<h2>User Data:</h2>
			<pre>{JSON.stringify(user, null, 2)}</pre>
		</section>
	);
}
