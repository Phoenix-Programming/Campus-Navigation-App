import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./src/App.tsx";
import "leaflet/dist/leaflet.css";
import "@styles/main.scss";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<App />
	</StrictMode>
);
