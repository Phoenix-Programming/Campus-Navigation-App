import { Navigate, type RouteObject } from "react-router";
import LeafletMap from "../components/LeafletMap";
import RootLayout from "../layouts/RootLayout";
import AccountPage from "../pages/admin/Account";
import LoginPage from "../pages/admin/Login";
import NotFound from "../pages/NotFound";
import RegisterPage from "../pages/admin/Register";
import NodeConnectionsEditor from "../pages/admin/NodeConnectionsEditor";


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
	},
	{
		path: "/admin",
		element: <RootLayout />,
		children: [
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{ path: "account", element: <AccountPage /> },
			{ path: "node-connections-editor", element: <NodeConnectionsEditor /> }
		]
	}
];

export default routes;
