import { useEffect, useState } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON } from "react-leaflet";
import type { LayerConfig, LoadedLayer } from "../types/layers";
import "@styles/main.scss";

const { BaseLayer, Overlay } = LayersControl;

export default function LeafletMap() {
	const [layers, setLayers] = useState<LoadedLayer[]>([]);
	const [cssLoaded, setCssLoaded] = useState(false);
	const [layerKey, setLayerKey] = useState(0); // Force re-render key

	useEffect(() => {
		const loadLayers = async () => {
			try {
				// Load the layers index
				const indexResponse = await fetch("/Campus-Navigation-App/data/outdoors/index.json");

				if (!indexResponse.ok) throw new Error(`Failed to load index: ${indexResponse.status}`);

				const config: LayerConfig = await indexResponse.json();

				// Load all layer data
				const layerPromises = config.layers.map(async (layerInfo) => {
					const response = await fetch(`/Campus-Navigation-App/data/outdoors/${layerInfo.file}`);

					if (!response.ok) throw new Error(`Failed to load ${layerInfo.id}: ${response.status}`);

					const data = await response.json();

					return {
						id: layerInfo.id,
						data,
						type: layerInfo.type,
						defaultShown: layerInfo.defaultShown
					};
				});

				const loadedLayers = await Promise.all(layerPromises);
				setLayers(loadedLayers);
			} catch (error) {
				console.error("Error loading layers:", error);
			}
		};

		loadLayers();
	}, []);

	// Check for CSS loading and force layer reload when ready
	useEffect(() => {
		const checkCSSLoaded = () => {
			try {
				// Create a test element to check if CSS rules are applied
				const testElement: HTMLDivElement = document.createElement("div");
				testElement.className = "layer layer--buildings";
				testElement.style.position = "absolute";
				testElement.style.visibility = "hidden";
				document.body.appendChild(testElement);

				const computedStyle: CSSStyleDeclaration = window.getComputedStyle(testElement);
				const hasStyles: boolean = computedStyle.stroke === "red" || computedStyle.fill === "red";

				document.body.removeChild(testElement);

				if (hasStyles && !cssLoaded) {
					setCssLoaded(true);
					// Force layers to re-render by updating the key
					setLayerKey((prev) => prev + 1);
				} else if (!hasStyles) {
					// Retry after a short delay
					setTimeout(checkCSSLoaded, 100);
				}
			} catch (error) {
				console.warn("CSS check failed:", error);
				// Fallback: assume loaded after a reasonable delay
				setTimeout(() => {
					if (!cssLoaded) {
						setCssLoaded(true);
						setLayerKey((prev) => prev + 1);
					}
				}, 2000);
			}
		};

		// Start checking after layers are loaded
		if (layers.length > 0 && !cssLoaded) checkCSSLoaded();
	}, [layers, cssLoaded]);

	const formatLayerName = (id: string): string => {
		return id
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	const formatClassName = (id: string): string => {
		const temp = "layer--" + id.replaceAll("_", "-");
		console.log(temp);
		return temp;
	};

	return (
		<MapContainer
			center={[28.1477, -81.8485]}
			zoom={16.25}
			zoomSnap={0}
			wheelPxPerZoomLevel={5}
			minZoom={16}
			maxZoom={20}
			className="map-container"
		>
			<LayersControl position="topright">
				<BaseLayer checked name="Map">
					<TileLayer
						attribution='&copy; <a href="https://carto.com/">CARTO</a>'
						url="https://cartodb-basemaps-a.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}.png"
					/>
				</BaseLayer>

				{layers.map((layer) => {
					return (
						<Overlay key={`${layer.id}-${layerKey}`} checked={layer.defaultShown} name={formatLayerName(layer.id)}>
							<GeoJSON
								key={`geojson-${layer.id}-${layerKey}`}
								data={layer.data}
								pathOptions={{ className: `layer ${formatClassName(layer.id)}` }}
							/>
						</Overlay>
					);
				})}
			</LayersControl>
		</MapContainer>
	);
}
