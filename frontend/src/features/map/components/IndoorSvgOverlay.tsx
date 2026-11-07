import { SVGOverlay, useMap } from "react-leaflet";
import type { LatLngBounds } from "leaflet";

export interface IndoorMapOverlayData {
	id: string;
	name: string;
	buildingId: string;
	svgMarkup: string;
	svgAttributes: Record<string, string>;
	svgTransform: string | undefined;
	bounds: LatLngBounds;
}

export default function IndoorSvgOverlay({ indoorMap }: { indoorMap: IndoorMapOverlayData }) {
	const map = useMap();

	return (
		<SVGOverlay
			attributes={indoorMap.svgAttributes}
			bounds={indoorMap.bounds}
			interactive
			eventHandlers={{
				add: () =>
					map.fitBounds(indoorMap.bounds, {
						padding: [16, 16],
						maxZoom: 19,
						animate: true,
						duration: 1
					}),
				click: () => {
					// Placeholder for indoor map click behavior.
				},
				mouseover: () => {
					// Placeholder for indoor map hover behavior.
				}
			}}
		>
			<g transform={indoorMap.svgTransform} dangerouslySetInnerHTML={{ __html: indoorMap.svgMarkup }} />
		</SVGOverlay>
	);
}
