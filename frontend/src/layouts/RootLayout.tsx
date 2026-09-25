import { useEffect, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router";
import { AUTH_CHANGE_EVENT } from "../auth/authEvents";
import { hasAdminAccess } from "../auth/adminAccess";
import { refreshAuthTokens } from "../auth/session";

interface RootLayoutProps {
	pageName: string;
	children?: ReactNode;
}

const publicLinks = [
	{ to: "/", label: "Home" },
	{ to: "/map", label: "Map" }
];

const adminLinks = [
	{ to: "/admin/login", label: "Login" },
	{ to: "/admin/register", label: "Register" },
	{ to: "/admin/account", label: "Account" },
	{ to: "/admin/dashboard", label: "Dashboard" },
	{ to: "/admin/node-connections-editor", label: "Node Connections Editor" },
	{ to: "/admin/indoor-map-editor", label: "Indoor Map Editor" }
];

export default function RootLayout({ pageName, children }: RootLayoutProps) {
	const displayedChildren = children ?? <Outlet />;
	const [canSeeAdminLinks, setCanSeeAdminLinks] = useState(() => hasAdminAccess());
	const currentLinks = canSeeAdminLinks ? [...publicLinks, ...adminLinks] : publicLinks;

	useEffect(() => {
		let isMounted = true;

		const updateAdminLinks = async () => {
			if (!hasAdminAccess()) {
				await refreshAuthTokens();
			}

			if (isMounted) {
				setCanSeeAdminLinks(hasAdminAccess());
			}
		};

		const handleAuthChange = () => {
			void updateAdminLinks();
		};

		void updateAdminLinks();
		window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
		window.addEventListener("storage", handleAuthChange);
		window.addEventListener("focus", handleAuthChange);

		return () => {
			isMounted = false;
			window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
			window.removeEventListener("storage", handleAuthChange);
			window.removeEventListener("focus", handleAuthChange);
		};
	}, []);

	return (
		<div className="root-layout">
			<header className="root-layout__header">
				<div className="root-layout__brand">
					<p className="root-layout__eyebrow">Florida Polytechnic University</p>
					<h1 className="root-layout__title">Campus Map</h1>
					<p className="root-layout__tagline">a student project</p>
				</div>

				<nav className="root-layout__nav" aria-label="Primary navigation">
					<div className="root-layout__links">
						{currentLinks.map((link) => (
							<NavLink
								key={link.to}
								to={link.to}
								className={({ isActive }) => `root-layout__link${isActive ? " root-layout__link--active" : ""}`}
							>
								{link.label}
							</NavLink>
						))}
					</div>
				</nav>
			</header>

			<main className="root-layout__main">{displayedChildren}</main>

			<footer className="root-layout__footer">
				<small>
					&copy; 2026 Florida Poly Campus Map - Unofficial student-developed project. Not affiliated with or endorsed by
					Florida Polytechnic University.
				</small>
			</footer>
		</div>
	);
}
