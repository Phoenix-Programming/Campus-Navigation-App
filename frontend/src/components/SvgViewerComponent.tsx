import { createContext, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import "@styles/components/svg-viewer-component.scss";

interface SvgViewerComponentProps {
	svg: string;
	allowPan: boolean;
	onMapClick: (coordinates: { x: number; y: number } | null) => void;
	children?: React.ReactNode;
	zoomStep?: number;
}

export interface SvgViewerHandle {
	getScale: () => number;
	zoomBy: (amount: number) => void;
}

export const DEFAULT_SVG_VIEWER_ZOOM_STEP = 0.1;
export const MIN_SVG_VIEWER_SCALE = 0.025;
export const MAX_SVG_VIEWER_SCALE = 1;

export interface SvgViewportMetrics {
	width: number;
	height: number;
}

export interface SvgViewportContextValue extends SvgViewportMetrics {
	suppressClicksRef: React.MutableRefObject<boolean>;
}

export const SvgViewportContext = createContext<SvgViewportContextValue | null>(null);

const SvgViewerComponent = forwardRef<SvgViewerHandle, SvgViewerComponentProps>(function SvgViewerComponent(
	{ svg, allowPan, onMapClick, children, zoomStep = DEFAULT_SVG_VIEWER_ZOOM_STEP },
	ref
): React.JSX.Element {
	const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isHovering, setIsHovering] = useState(false);
	const viewerRef = useRef<HTMLDivElement>(null);
	const imgRef = useRef<HTMLImageElement>(null);
	const suppressClicksRef = useRef(false);
	const pointerDownRef = useRef(false);
	const dragStartedRef = useRef(false);
	const dragging = useRef(false);
	const last = useRef({ x: 0, y: 0 });
	const svgSrc: string = svg.includes("<svg") ? `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}` : svg;

	const svgMetrics: SvgViewportMetrics | null = useMemo<SvgViewportMetrics | null>(() => {
		const widthMatch: RegExpMatchArray | null = svg.match(/width\s*=\s*["']([^"']+)["']/i);
		const heightMatch: RegExpMatchArray | null = svg.match(/height\s*=\s*["']([^"']+)["']/i);

		if (widthMatch && heightMatch) {
			const width: number = Number.parseFloat(widthMatch[1]);
			const height: number = Number.parseFloat(heightMatch[1]);
			if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return { width, height };
		}

		const viewBoxMatch: RegExpMatchArray | null = svg.match(/viewBox\s*=\s*["']([^"']+)['"]/i);
		if (viewBoxMatch) {
			const parts: number[] = viewBoxMatch[1]
				.trim()
				.split(/[\s,]+/)
				.map(Number);

			if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] };
		}

		return null;
	}, [svg]);

	useEffect(() => {
		setTransform({ scale: 1, x: 0, y: 0 });

		const frame: number = window.requestAnimationFrame(() => {
			fitToViewer();
		});

		return () => window.cancelAnimationFrame(frame);
	}, [svgSrc]);

	useEffect(() => {
		document.body.style.overflow = isHovering ? "hidden" : "";

		return () => {
			document.body.style.overflow = "";
		};
	}, [isHovering]);

	useImperativeHandle(
		ref,
		() => ({
			getScale: () => transform.scale,
			zoomBy: (amount: number): void => {
				const viewer: HTMLDivElement | null = viewerRef.current;
				if (!viewer) return;

				const rect: DOMRect = viewer.getBoundingClientRect();
				const anchorX: number = rect.width / 2;
				const anchorY: number = rect.height / 2;

				setTransform((prev) => {
					const nextScale: number = clamp(prev.scale + amount, MIN_SVG_VIEWER_SCALE, MAX_SVG_VIEWER_SCALE);
					const imageX: number = (anchorX - prev.x) / prev.scale;
					const imageY: number = (anchorY - prev.y) / prev.scale;

					return {
						scale: nextScale,
						x: anchorX - imageX * nextScale,
						y: anchorY - imageY * nextScale
					};
				});
			}
		}),
		[transform.scale]
	);

	console.log("SvgViewerComponent Rerendering...");

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(min, value), max);
	}

	function getSvgDimensions(): { width: number; height: number } | null {
		const img: HTMLImageElement | null = imgRef.current;
		if (img && img.naturalWidth > 0 && img.naturalHeight > 0)
			return { width: img.naturalWidth, height: img.naturalHeight };

		const viewBoxMatch: RegExpMatchArray | null = svg.match(/viewBox\s*=\s*["']([^"']+)["']/i);
		if (viewBoxMatch) {
			const parts: number[] = viewBoxMatch[1]
				.trim()
				.split(/[\s,]+/)
				.map(Number);

			if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) return { width: parts[2], height: parts[3] };
		}

		const widthMatch: RegExpMatchArray | null = svg.match(/width\s*=\s*["']([^"']+)["']/i);
		const heightMatch: RegExpMatchArray | null = svg.match(/height\s*=\s*["']([^"']+)["']/i);
		if (widthMatch && heightMatch) {
			const width: number = Number.parseFloat(widthMatch[1]);
			const height: number = Number.parseFloat(heightMatch[1]);
			if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) return { width, height };
		}

		return null;
	}

	function fitToViewer(): void {
		const viewer: HTMLDivElement | null = viewerRef.current;
		const dimensions: { width: number; height: number } | null = getSvgDimensions();

		if (!viewer || !dimensions) return;

		const { width: viewerWidth, height: viewerHeight } = viewer.getBoundingClientRect();
		if (viewerWidth <= 0 || viewerHeight <= 0) return;

		const scale: number = Math.min(viewerWidth / dimensions.width, viewerHeight / dimensions.height);
		const x: number = (viewerWidth - dimensions.width * scale) / 2;
		const y: number = (viewerHeight - dimensions.height * scale) / 2;

		setTransform({ scale, x, y });
	}

	function onWheel(e: React.WheelEvent<HTMLDivElement>) {
		e.preventDefault();

		const viewer: HTMLDivElement | null = viewerRef.current;
		if (!viewer) return;

		const rect: DOMRect = viewer.getBoundingClientRect();
		const mouseX: number = e.clientX - rect.left;
		const mouseY: number = e.clientY - rect.top;
		const zoomFactor: number = e.deltaY > 0 ? 0.9 : 1.1;

		setTransform((prev) => {
			const nextScale: number = clamp(prev.scale * zoomFactor, MIN_SVG_VIEWER_SCALE, MAX_SVG_VIEWER_SCALE);
			const imageX: number = (mouseX - prev.x) / prev.scale;
			const imageY: number = (mouseY - prev.y) / prev.scale;

			return {
				scale: nextScale,
				x: mouseX - imageX * nextScale,
				y: mouseY - imageY * nextScale
			};
		});
	}

	function getMapCoordinatesFromPointer(event: React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null {
		if (!svgMetrics) return null;

		const renderRect: Pick<DOMRect, "left" | "top" | "width" | "height"> = imgRef.current?.getBoundingClientRect() ??
			viewerRef.current?.getBoundingClientRect() ?? { left: 0, top: 0, width: 0, height: 0 };

		if (renderRect.width <= 0 || renderRect.height <= 0) return null;

		const pointerX: number = event.clientX - renderRect.left;
		const pointerY: number = event.clientY - renderRect.top;
		const svgX: number = (pointerX / renderRect.width) * svgMetrics.width;
		const svgY: number = (pointerY / renderRect.height) * svgMetrics.height;

		if (!Number.isFinite(svgX) || !Number.isFinite(svgY)) return null;
		if (svgX < 0 || svgY < 0 || svgX > svgMetrics.width || svgY > svgMetrics.height) return null;

		return { x: svgX, y: svgY };
	}

	function onMapClickHandler(event: React.MouseEvent<HTMLDivElement>): void {
		if (!allowPan) {
			event.preventDefault();
			event.stopPropagation();
			const svgCoordinates: { x: number; y: number } | null = getMapCoordinatesFromPointer(event);
			onMapClick(svgCoordinates);
		}
	}

	function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
		if (e.button !== 0 && e.button !== 1) return;

		if (!allowPan) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		e.preventDefault();
		pointerDownRef.current = true;
		dragStartedRef.current = false;
		dragging.current = true;
		suppressClicksRef.current = false;
		setIsDragging(true);
		last.current = { x: e.clientX, y: e.clientY };
	}

	function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
		if (!pointerDownRef.current) return;

		const dx: number = e.clientX - last.current.x;
		const dy: number = e.clientY - last.current.y;
		const dragThresholdSquared: number = 16;

		if (!dragStartedRef.current) {
			const totalDx: number = e.clientX - last.current.x;
			const totalDy: number = e.clientY - last.current.y;
			if (totalDx * totalDx + totalDy * totalDy < dragThresholdSquared) return;

			dragStartedRef.current = true;
			dragging.current = true;
			setIsDragging(true);
			suppressClicksRef.current = true;
			last.current = { x: e.clientX, y: e.clientY };
			return;
		}

		if (!dragging.current) return;

		last.current = { x: e.clientX, y: e.clientY };

		setTransform((prev) => ({
			...prev,
			x: prev.x + dx,
			y: prev.y + dy
		}));
	}

	function onMouseUp(e?: React.MouseEvent<HTMLDivElement>): void {
		if (!allowPan && e) {
			e.preventDefault();
			e.stopPropagation();
			onMapClickHandler(e);
			return;
		}

		const shouldSuppressClick: boolean = dragStartedRef.current;

		pointerDownRef.current = false;
		dragStartedRef.current = false;
		dragging.current = false;
		setIsDragging(false);

		if (shouldSuppressClick) {
			window.setTimeout(() => {
				suppressClicksRef.current = false;
			}, 0);
		}
	}

	const onMouseEnter = (): void => {
		setIsHovering(true);
	};

	const onMouseLeave = (): void => {
		setIsHovering(false);
		onMouseUp();
	};

	return (
		<div
			ref={viewerRef}
			className="viewer"
			style={{ position: "relative" }}
			onWheel={onWheel}
			onMouseDown={onMouseDown}
			onMouseMove={onMouseMove}
			onMouseUp={onMouseUp}
			onMouseLeave={onMouseLeave}
			onMouseEnter={onMouseEnter}
		>
			<div
				style={{
					transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
					transformOrigin: "top left",
					userSelect: "none",
					position: "absolute",
					left: 0,
					top: 0,
					cursor: isDragging ? "grabbing" : "grab"
				}}
				onMouseDown={onMouseDown}
			>
				<SvgViewportContext.Provider
					value={
						svgMetrics
							? {
									...svgMetrics,
									suppressClicksRef
								}
							: null
					}
				>
					<img
						ref={imgRef}
						src={svgSrc}
						alt="svg"
						draggable={false}
						onLoad={fitToViewer}
						style={{ display: "block", cursor: isDragging ? "grabbing" : "grab", pointerEvents: "none" }}
					/>
					{children}
				</SvgViewportContext.Provider>
			</div>
		</div>
	);
});

export default SvgViewerComponent;
