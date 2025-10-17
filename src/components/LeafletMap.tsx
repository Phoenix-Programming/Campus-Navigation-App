import { useEffect, useState } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON } from "react-leaflet";
import type { LayerConfig, LoadedLayer } from "../types/layers";
import "@styles/main.scss";

const { BaseLayer, Overlay } = LayersControl;

export default function LeafletMap() {
	const [layers, setLayers] = useState<LoadedLayer[]>([]);

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
						<Overlay key={layer.id} checked={layer.defaultShown} name={formatLayerName(layer.id)}>
							<GeoJSON data={layer.data} pathOptions={{ className: `layer ${formatClassName(layer.id)}` }} />
						</Overlay>
					);
				})}
			</LayersControl>
		</MapContainer>
	);
}
