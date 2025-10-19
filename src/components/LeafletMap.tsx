import { useEffect, useState } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import type { LayerData, LayerConfig, LoadedLayer } from "../types/layers";
import "@styles/main.scss";

const { BaseLayer, Overlay } = LayersControl;

export default function LeafletMap() {
	const [layers, setLayers] = useState<LoadedLayer[]>([]);

	useEffect(() => {
		const loadLayers = async () => {
			try {
				// Load the layers index
				const indexResponse: Response = await fetch("/Campus-Navigation-App/data/outdoors/index.json");

				if (!indexResponse.ok) throw new Error(`Failed to load index: ${indexResponse.status}`);

				const config: LayerConfig = await indexResponse.json();

				// Load all layer data
				const layerPromises: Promise<LoadedLayer>[] = config.layers.map(
					async (layerInfo: LayerData): Promise<LoadedLayer> => {
						const response: Response = await fetch(`/Campus-Navigation-App/data/outdoors/${layerInfo.file}`);

						if (!response.ok) throw new Error(`Failed to load ${layerInfo.id}: ${response.status}`);

						const data: GeoJsonObject = await response.json();

						return {
							id: layerInfo.id,
							data,
							type: layerInfo.type,
							defaultShown: layerInfo.defaultShown
						};
					}
				);

				const loadedLayers: LoadedLayer[] = await Promise.all(layerPromises);
				setLayers(loadedLayers);
			} catch (error) {
				console.error("Error loading layers:", error);
			}
		};

		loadLayers();
	});

	const formatLayerName = (id: string): string => {
		return id
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	const getLayerStyle = (id: string): Record<string, string | number> => {
		const styleMap: Record<string, Record<string, string | number>> = {
			buildings: { color: "red", fillColor: "red", fillOpacity: 0.6, weight: 2 },
			paths: { color: "blue", weight: 3, fillOpacity: 0 },
			parking_lots: { color: "purple", fillColor: "purple", fillOpacity: 0.6, weight: 2 }
		};
		return styleMap[id] || { color: "black", fillColor: "black", fillOpacity: 0.3, weight: 1 };
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
							<GeoJSON data={layer.data} pathOptions={getLayerStyle(layer.id)} />
						</Overlay>
					);
				})}
			</LayersControl>
		</MapContainer>
	);
}
