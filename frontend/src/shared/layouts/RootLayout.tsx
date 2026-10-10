import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { NavLink, Outlet } from "react-router";
import { AUTH_CHANGE_EVENT } from "@features/auth/utils/authEvents";
import { hasAdminAccess } from "@features/auth/utils/adminAccess";
import { refreshAuthTokens } from "@features/auth/utils/session";
import "@shared/styles/layouts/root-layout.scss";


interface RootLayoutProps {
	pageName: string;
	children?: ReactNode;
}


const creationYear: number = 2026; // The year this project was created
const currentYear: number = new Date().getFullYear();

const publicLinks = [
	{ to: "/", label: "Home" },
	{ to: "/map", label: "Map" }
];

const adminLinks = [
	{ to: "/admin/login", label: "Login" },
	{ to: "/admin/register", label: "Register" },
	{ to: "/admin/account", label: "Account" },
	{ to: "/admin/dashboard", label: "Dashboard" },
	{ to: "/admin/indoor-map-editor", label: "Indoor Map Editor" }
];


export default function RootLayout({ pageName, children }: RootLayoutProps) {
	const displayedChildren = children ?? <Outlet />;
	const [canSeeAdminLinks, setCanSeeAdminLinks] = useState(() => hasAdminAccess());
	const currentLinks = canSeeAdminLinks ? [...publicLinks, ...adminLinks] : publicLinks;

	useEffect(() => {
		let isMounted: boolean = true;

		const updateAdminLinks = async () => {
			if (!hasAdminAccess()) await refreshAuthTokens();

			if (isMounted) setCanSeeAdminLinks(hasAdminAccess());
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
			<header>
				<div className="brand">
					<p className="eyebrow">Florida Polytechnic University</p>
					<h1 className="title">Campus Map</h1>
					<p className="tagline">a student project</p>
				</div>

				<nav aria-label="Primary navigation">
					<div className="links">
						{currentLinks.map((link) => (
							<NavLink
								key={link.to}
								to={link.to}
								className={({ isActive }) =>
									clsx("link", {
										active: isActive
									})
								}
							>
								{link.label}
							</NavLink>
						))}
					</div>
				</nav>
			</header>

			<main>{displayedChildren}</main>

			<footer>
				<hr />

				<small>
					&copy; {creationYear + (currentYear > creationYear ? `-${currentYear}` : "")} Phoenix Programming.
					All Rights Reserved.
					<br />
					Developed independently by Phoenix Programming, a student club. This project is
					not an official Florida Polytechnic University application and is not sponsored,
					endorsed, or maintained by the University.
				</small>
			</footer>
		</div>
	);
}
