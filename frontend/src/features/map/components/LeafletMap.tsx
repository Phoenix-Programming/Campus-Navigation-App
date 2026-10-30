import { useEffect, useState } from "react";
import { MapContainer, TileLayer, LayersControl, GeoJSON, SVGOverlay, ZoomControl } from "react-leaflet";
import L, { type LatLngBounds } from "leaflet";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import type { LayerData, LayerConfig, LoadedLayer } from "@features/map/models/layers";
import { showError } from "@features/notifications/services/notifications.service";
import "@shared/styles/main.scss";

const { BaseLayer, Overlay } = LayersControl;

interface IndoorMapData {
	id: string;
	name: string;
	buildingId: string;
	file: string;
}

interface IndoorMapConfig {
	maps: IndoorMapData[];
}

interface LoadedIndoorMap extends IndoorMapData {
	svgMarkup: string;
	svgAttributes: Record<string, string>;
	bounds: LatLngBounds;
}

function IndoorSvgOverlay({ indoorMap }: { indoorMap: LoadedIndoorMap }) {
	return (
		<SVGOverlay
			attributes={indoorMap.svgAttributes}
			bounds={indoorMap.bounds}
			interactive
			eventHandlers={{
				click: () => {
					// Placeholder for indoor map click behavior.
				},
				mouseover: () => {
					// Placeholder for indoor map hover behavior.
				}
			}}
		>
			<g dangerouslySetInnerHTML={{ __html: indoorMap.svgMarkup }} />
		</SVGOverlay>
	);
}

export default function LeafletMap() {
	const [layers, setLayers] = useState<LoadedLayer[]>([]);
	const [indoorMaps, setIndoorMaps] = useState<LoadedIndoorMap[]>([]);

	useEffect(() => {
		const loadLayers = async () => {
			try {
				// Load the layers index
				const indexResponse: Response = await fetch("/data/outdoors/index.json");

				if (!indexResponse.ok) throw new Error(`Failed to load index: ${indexResponse.status}`);

				const config: LayerConfig = await indexResponse.json();

				// Load all layer data
				const layerPromises: Promise<LoadedLayer>[] = config.layers.map(
					async (layerInfo: LayerData): Promise<LoadedLayer> => {
						const response: Response = await fetch(`/data/outdoors/${layerInfo.file}`);

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

				const buildings = loadedLayers.find((layer) => layer.id === "buildings");
				if (!buildings || buildings.data.type !== "FeatureCollection") {
					throw new Error("Building features are unavailable for indoor map positioning.");
				}
				const buildingCollection = buildings.data as FeatureCollection;

				const directoryResponse = await fetch("/data/indoors/directory.json");
				if (!directoryResponse.ok) {
					throw new Error(`Failed to load indoor map directory: ${directoryResponse.status}`);
				}
				const indoorConfig: IndoorMapConfig = await directoryResponse.json();

				const loadedIndoorMaps = await Promise.all(
					indoorConfig.maps.map(async (mapInfo): Promise<LoadedIndoorMap> => {
						const buildingFeature = buildingCollection.features.find(
							(feature) => feature.properties?.bld_id === mapInfo.buildingId
						);
						if (!buildingFeature) {
							throw new Error(`Building ${mapInfo.buildingId} was not found for indoor map ${mapInfo.id}.`);
						}

						const response = await fetch(`/data/indoors/${mapInfo.file}`);
						if (!response.ok) {
							throw new Error(`Failed to load indoor map ${mapInfo.id}: ${response.status}`);
						}

						const svgText = await response.text();
						const parsedDocument = new DOMParser().parseFromString(svgText, "image/svg+xml");
						const svgElement = parsedDocument.querySelector("svg");
						if (
							!svgElement ||
							svgElement.namespaceURI !== "http://www.w3.org/2000/svg" ||
							parsedDocument.querySelector("parsererror")
						) {
							throw new Error(`Indoor map ${mapInfo.id} is not valid SVG.`);
						}

						const svgAttributes = Object.fromEntries(
							Array.from(svgElement.attributes)
								.filter(({ name }) => !["id", "width", "height"].includes(name))
								.map(({ name, value }) => [name, value])
						);
						const bounds = L.geoJSON(buildingFeature).getBounds();
						if (!bounds.isValid()) {
							throw new Error(`Building bounds are invalid for indoor map ${mapInfo.id}.`);
						}

						return {
							...mapInfo,
							svgMarkup: svgElement.innerHTML,
							svgAttributes,
							bounds
						};
					})
				);
				setIndoorMaps(loadedIndoorMaps);
			} catch (error) {
				console.error("Error loading layers:", error);
				showError(
					error instanceof Error ? error.message : "The map layers could not be loaded.",
					"Failed to Load Map Data"
				);
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

	const getLayerStyle = (id: string): Record<string, string | number> => {
		const styleMap: Record<string, Record<string, string | number>> = {
			buildings: { color: "red", fillColor: "red", fillOpacity: 0.6, weight: 2 },
			paths: { color: "blue", weight: 3, fillOpacity: 0 },
			parking_lots: { color: "purple", fillColor: "purple", fillOpacity: 0.6, weight: 2 },
			lakes: { color: "cyan", fillColor: "cyan", fillOpacity: 0.5, weight: 2 }
		};
		return styleMap[id] || { color: "black", fillColor: "black", fillOpacity: 0.3, weight: 1 };
	};

	return (
		<MapContainer
			id="map"
			center={[28.1477, -81.8485]}
			zoom={17}
			zoomControl={false}
			zoomSnap={0}
			wheelPxPerZoomLevel={15}
			minZoom={17}
			maxZoom={20}
			className="map-container"
			maxBounds={[
				[28.152252975549075, -81.85449203443713],
				[28.143692836097017, -81.84371128216179]
			]}
			maxBoundsViscosity={1.0}
		>
			<ZoomControl position="bottomleft" />

			<LayersControl position="bottomright">
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

				{indoorMaps.map((indoorMap) => (
					<Overlay key={indoorMap.id} checked={false} name={indoorMap.name}>
						<IndoorSvgOverlay indoorMap={indoorMap} />
					</Overlay>
				))}
			</LayersControl>
		</MapContainer>
	);
}
