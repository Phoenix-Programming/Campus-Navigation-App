import { type JSX } from "react";
import { createBrowserRouter, RouterProvider } from "react-router";
import routes from "./routes/Routes";


const router = createBrowserRouter(routes);

export default function App(): JSX.Element {
	return <RouterProvider router={router} />;
}
