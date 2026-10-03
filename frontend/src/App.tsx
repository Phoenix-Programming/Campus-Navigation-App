import { type JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import NotificationCenter from "./components/NotificationCenter";
import routes from "./routes/Routes";
import "@styles/main.scss";

const router = createBrowserRouter(routes);

export default function App(): JSX.Element {
	return (
		<>
			<NotificationCenter />
			<RouterProvider router={router} />
		</>
	);
}
