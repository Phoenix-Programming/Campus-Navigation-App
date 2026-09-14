import { Link } from "react-router";


export default function RootLayout() {
	return (
		<>
			<Link to="/admin/login">Login</Link>
			<br />
			<Link to="/admin/register">Register</Link>
			<br />
			<Link to="/admin/account">Account</Link>
			<br />
			<Link to="/admin/node-connections-editor">Node Connections Editor</Link>
		</>
	);
}
