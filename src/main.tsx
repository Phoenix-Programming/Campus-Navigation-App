// Load CSS first
import "leaflet/dist/leaflet.css";
import "@styles/main.scss";

// Wait a tick for CSS to process, then load React components
Promise.resolve().then(() => {
	import("react").then(({ StrictMode }) => {
		import("react-dom/client").then(({ createRoot }) => {
			import("./App.tsx").then(({ default: App }) => {
				createRoot(document.getElementById("root")!).render(
					<StrictMode>
						<App />
					</StrictMode>
				);
			});
		});
	});
});
