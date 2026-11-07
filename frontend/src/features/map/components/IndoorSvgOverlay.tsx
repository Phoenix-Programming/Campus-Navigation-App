import { useEffect, useRef, useState } from "react";
import { SVGOverlay, useMap } from "react-leaflet";
import L, { type LatLngBounds } from "leaflet";

export interface IndoorMapOverlayData {
	id: string;
	name: string;
	buildingId: string;
	svgMarkup: string;
	svgAttributes: Record<string, string>;
	svgTransform: string | undefined;
	bounds: LatLngBounds;
	defaultVisible?: boolean;
	focusOnAdd?: boolean;
}

interface IndoorSvgOverlayProps {
	indoorMap: IndoorMapOverlayData;
	onFocusChange: (id: string, isFocused: boolean) => void;
}

export default function IndoorSvgOverlay({ indoorMap, onFocusChange }: IndoorSvgOverlayProps) {
	const map = useMap();
	const [isFocused, setIsFocused] = useState(false);
	const focusZoom = useRef(0);

	const focusIndoorMap = () => {
		focusZoom.current = Math.max(
			map.getMinZoom(),
			Math.min(19, map.getBoundsZoom(indoorMap.bounds, false, L.point(16, 16)))
		);
		setIsFocused(true);
		onFocusChange(indoorMap.id, true);
		map.once("moveend", () => {
			focusZoom.current = map.getZoom();
		});
		map.fitBounds(indoorMap.bounds, {
			padding: [16, 16],
			maxZoom: 19,
			animate: true,
			duration: 1
		});
	};

	useEffect(() => {
		if (!isFocused) return;

		const updateFocus = () => {
			const zoomedOut = map.getZoom() < focusZoom.current;
			const pannedAway = !map.getBounds().contains(indoorMap.bounds.getCenter());

			if (zoomedOut || pannedAway) {
				setIsFocused(false);
				onFocusChange(indoorMap.id, false);
			}
		};

		map.on("moveend", updateFocus);
		map.on("zoomend", updateFocus);
		return () => {
			map.off("moveend", updateFocus);
			map.off("zoomend", updateFocus);
		};
	}, [indoorMap.bounds, indoorMap.id, isFocused, map, onFocusChange]);

	return (
		<SVGOverlay
			attributes={indoorMap.svgAttributes}
			bounds={indoorMap.bounds}
			pane="markerPane"
			interactive
			eventHandlers={{
				add: () => {
					if (indoorMap.focusOnAdd === false) return;
					focusIndoorMap();
				},
				remove: () => {
					focusZoom.current = 0;
					setIsFocused(false);
					onFocusChange(indoorMap.id, false);
				},
				click: focusIndoorMap
			}}
		>
			<g
				className={`indoor-svg-artwork${isFocused ? " indoor-svg-artwork-focused" : ""}`}
				transform={indoorMap.svgTransform}
				dangerouslySetInnerHTML={{ __html: indoorMap.svgMarkup }}
			/>
		</SVGOverlay>
	);
}
