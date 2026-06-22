import { Navigate, type RouteObject } from "react-router";
import LeafletMap from "../components/LeafletMap";
import RootLayout from "../layouts/RootLayout";
import AccountPage from "../pages/Account";
import LoginPage from "../pages/Login";
import NotFound from "../pages/NotFound";
import RegisterPage from "../pages/Register";


const routes: RouteObject[] = [
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{ index: true, element: <Navigate to="/map" replace /> },
			{ path: "map", element: <LeafletMap /> },
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{ path: "account", element: <AccountPage /> },
			{ path: "*", element: <NotFound /> }
		]
	}
];

export default routes;
