import type React from "react";

export interface SvgViewerHandle {
	getScale: () => number;
	zoomBy: (amount: number) => void;
}

export interface SvgViewportMetrics {
	width: number;
	height: number;
}

export interface SvgViewportContextValue extends SvgViewportMetrics {
	suppressClicksRef: React.MutableRefObject<boolean>;
}
