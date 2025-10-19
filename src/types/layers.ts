import { type GeoJsonObject } from "geojson";

interface LayerData {
	id: string;
	file: string;
	type: string;
	defaultShown: boolean;
}

export interface LayerConfig {
	layers: LayerData[];
}

export interface LoadedLayer {
	id: string;
	data: GeoJsonObject;
	type: string;
	defaultShown: boolean;
}
