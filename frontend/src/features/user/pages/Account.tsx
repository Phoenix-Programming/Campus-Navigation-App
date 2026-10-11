import React, { useRef, useState } from "react";
import { getUser as getUserService } from "../services/user_service";
import type { PublicUserData } from "../models/user_models";

export default function AccountPage(): React.JSX.Element {
	const userIdInputRef = useRef<HTMLInputElement>(null);
	const [user, setUser] = useState<PublicUserData | null>(null);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setUser(await getUserService(userIdInputRef.current?.valueAsNumber ?? -1));
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
