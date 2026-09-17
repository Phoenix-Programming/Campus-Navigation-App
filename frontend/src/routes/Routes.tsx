import { Navigate, type RouteObject } from "react-router";
import Map from "../pages/Map";
import RootLayout from "../layouts/RootLayout";
import AccountPage from "../pages/Account";
import LoginPage from "../pages/Login";
import NotFound from "../pages/NotFound";
import RegisterPage from "../pages/Register";

//Website routes
const routes: RouteObject[] = [
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{ index: true, element: <Navigate to="/map" replace /> },
			{ path: "map", element: <Map /> },
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{ path: "account", element: <AccountPage /> },
			{ path: "*", element: <NotFound /> }
		]
	}
];

export default routes;
