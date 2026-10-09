import { StrictMode } from "react";
import { createRoot, type Container, type Root } from "react-dom/client";
import "leaflet/dist/leaflet.css";
import App from "./App.tsx";
import { showError } from "./services/notifications";
import "@styles/main.scss";


const container: Container = document.getElementById("root")!;

const root: Root = createRoot(
	container!,
	{
		onUncaughtError: (error, errorInfo) => {
			console.error("Uncaught error:", error);
			showError(String(error), "Uncaught Error");
		}
	}
);

root.render(
	<StrictMode>
		<App />
	</StrictMode>
);
