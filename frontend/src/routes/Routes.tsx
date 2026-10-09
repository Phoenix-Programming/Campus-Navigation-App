import { type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router";
import { adminRoute } from "./AdminRoute";
import LeafletMap from "../components/LeafletMap";
import RootLayout from "../layouts/RootLayout";
import AccountPage from "../pages/admin/Account";
import LoginPage from "../pages/admin/Login";
import NotFound from "../pages/NotFound";
import RegisterPage from "../pages/admin/Register";
import NodeConnectionsEditor from "../pages/admin/NodeConnectionsEditor";
import Unauthorized from "../pages/Unauthorized";
import AdminDashboard from "../pages/admin/AdminDashboard";
import IndoorMapEditor from "../pages/admin/IndoorMapEditor";

function withLayout(pageName: string, element: ReactNode): ReactNode {
	return <RootLayout pageName={pageName}>{element}</RootLayout>;
}

const routes: RouteObject[] = [
	{
		path: "/",
		children: [
			{ index: true, element: <Navigate to="/map" replace /> },
			{ path: "map", element: withLayout("Map", <LeafletMap />) },
			{ path: "unauthorized", element: withLayout("Unauthorized", <Unauthorized />) },
			{ path: "*", element: withLayout("Page Not Found", <NotFound />) }
		]
	},
	{
		path: "/admin",
		children: [
			{ path: "login", element: withLayout("Login", <LoginPage />) },
			{ path: "register", element: withLayout("Register", <RegisterPage />) },
			{
				loader: adminRoute, //restricts the routes to admins only
				children: [
					{ path: "account", element: withLayout("Account", <AccountPage />) },
					{ path: "dashboard", element: withLayout("Admin Dashboard", <AdminDashboard />) },
					{
						path: "node-connections-editor",
						element: withLayout("Node Connections Editor", <NodeConnectionsEditor />)
					},
					{ path: "indoor-map-editor", element: withLayout("Indoor Map Editor", <IndoorMapEditor />) }
				]
			}
		]
	}
];

export default routes;
