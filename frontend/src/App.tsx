import { type JSX } from "react";
import { useRoutes } from "react-router";
import routes from "./routes/Routes";


export default function App(): JSX.Element {
	const element = useRoutes(routes);

	return element ?? <></>;
}
