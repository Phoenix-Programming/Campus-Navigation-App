// Import CSS first to ensure it loads before React components
import "leaflet/dist/leaflet.css";
import "@styles/main.scss";

// Wait for CSS to be processed before importing and rendering React
const initializeApp = async () => {
	// Small delay to ensure CSS is fully processed
	await new Promise(resolve => setTimeout(resolve, 100));

	// Dynamic imports to ensure CSS loads first
	const [
		{ StrictMode },
		{ createRoot },
		{ default: App }
	] = await Promise.all([
		import("react"),
		import("react-dom/client"),
		import("./App.tsx")
	]);

	createRoot(document.getElementById("root")!).render(
		<StrictMode>
			<App />
		</StrictMode>
	);
};

initializeApp();
