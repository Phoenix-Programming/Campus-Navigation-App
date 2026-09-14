import { Navigate, type RouteObject } from "react-router";
import LeafletMap from "../components/LeafletMap";
import RootLayout from "../layouts/RootLayout";
import AccountPage from "../pages/admin/Account";
import LoginPage from "../pages/admin/Login";
import NotFound from "../pages/NotFound";
import RegisterPage from "../pages/admin/Register";
import NodeConnectionsEditor from "../pages/admin/NodeConnectionsEditor";
import Unauthorized from "../pages/Unauthorized";
import AdminDashboard from "../pages/admin/AdminDashboard";
import { adminRoute } from "./AdminRoute";


const routes: RouteObject[] = [
	{
		path: "/",
		element: <RootLayout />,
		children: [
			{ index: true, element: <Navigate to="/map" replace /> },
			{ path: "map", element: <LeafletMap /> },
			{ path: "unauthorized", element: <Unauthorized /> },
			{ path: "*", element: <NotFound /> }
		]
	},
	{
		path: "/admin",
		element: <RootLayout />,
		children: [
			{ path: "login", element: <LoginPage /> },
			{ path: "register", element: <RegisterPage /> },
			{
				loader: adminRoute,  //restricts the routes to admins only
				children: [
					{ path: "account", element: <AccountPage /> },
					{ path: "dashboard", element: <AdminDashboard /> },
					{ path: "node-connections-editor", element: <NodeConnectionsEditor /> },
				]
			}
		]
	}
];

export default routes;
