import { Link, Outlet } from "react-router";


export default function RootLayout() {
	return (
		<div>
			<header>
				<h1>Florida Polytechnic University Campus Map</h1>
				<nav>
					<Link to="/">Home</Link> | <Link to="/map">Map</Link> | <Link to="/login">Login</Link> | <Link to="/register">Register</Link> | <Link to="/account">Account</Link>
				</nav>
			</header>
			<main>
				<Outlet />
			</main>
			<footer>
				<small>&copy; 2026 Florida Poly Campus Map - Unofficial student-developed project. Not affiliated with or endorsed by Florida Polytechnic University.</small>
			</footer>
		</div>
	);
}
