import { type ReactNode } from "react";
import { Navigate, type RouteObject } from "react-router";
import { adminRoute } from "./AdminRoute";
import Map from "@features/map/pages/Map";
import RootLayout from "@shared/layouts/RootLayout";
import AccountPage from "@features/user/pages/Account";
import LoginPage from "@features/user/pages/Login";
import NotFound from "@shared/pages/NotFound";
import RegisterPage from "@features/user/pages/Register";
import Unauthorized from "@features/auth/pages/Unauthorized";
import AdminDashboard from "@features/auth/pages/AdminDashboard";
import IndoorMapEditor from "@features/indoor-map-editor/pages/IndoorMapEditor";

function withLayout(pageName: string, element: ReactNode): ReactNode {
	return <RootLayout pageName={pageName}>{element}</RootLayout>;
}

const routes: RouteObject[] = [
	{
		path: "/",
		children: [
			{ index: true, element: <Navigate to="/map" replace /> },
			{ path: "map", element: withLayout("Map", <Map />) },
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
					{ path: "indoor-map-editor", element: withLayout("Indoor Map Editor", <IndoorMapEditor />) }
				]
			}
		]
	}
];

export default routes;
