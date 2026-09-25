import React, { useContext, useRef, useState } from "react";
import { clsx } from "clsx";
import { SvgViewportContext, type SvgViewportMetrics } from "./SvgViewerComponent";
import "@styles/components/node-component.scss";

export interface Node {
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
}

interface NodeComponentProps {
	node: Node;
	isSelected: boolean;
	moveNodeMode: boolean;
	onNodeClick: (node: Node) => void;
	setHoveredNode: (node: Node | null) => void;
	moveNode: (nodeId: string, newX: number, newY: number) => void;
}

export default function NodeComponent({
	node,
	isSelected,
	moveNodeMode,
	onNodeClick,
	setHoveredNode,
	moveNode
}: NodeComponentProps): React.JSX.Element {
	const [isHovered, setIsHovered] = useState<boolean>(false);

	const lastHoveringStateRef = useRef<boolean>(false);
	const draggingRef = useRef<boolean>(false);
	const dragPointerIdRef = useRef<number | null>(null);
	const dragOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	const svgViewportContext = useContext(SvgViewportContext);

	const svgViewport: SvgViewportMetrics | null = svgViewportContext;
	const suppressClicksRef = svgViewportContext?.suppressClicksRef;
	const normalizedLeft: string = svgViewport ? `${(node.x / svgViewport.width) * 100}%` : `${node.x}px`;
	const normalizedTop: string = svgViewport ? `${(node.y / svgViewport.height) * 100}%` : `${node.y}px`;

	function getSvgCoordinatesFromPointer(
		clientX: number,
		clientY: number,
		target: SVGSVGElement
	): { x: number; y: number } | null {
		if (!svgViewport) return null;

		const mapContainerRect: DOMRect = target.parentElement?.getBoundingClientRect() ?? target.getBoundingClientRect();
		if (mapContainerRect.width <= 0 || mapContainerRect.height <= 0) return null;

		const normalizedX: number = (clientX - mapContainerRect.left) / mapContainerRect.width;
		const normalizedY: number = (clientY - mapContainerRect.top) / mapContainerRect.height;

		return {
			x: normalizedX * svgViewport.width,
			y: normalizedY * svgViewport.height
		};
	}

	function clamp(value: number, min: number, max: number): number {
		return Math.min(Math.max(value, min), max);
	}

	function onClick(node: Node): void {
		onNodeClick(node);
	}

	function handleIsHoveredChange(hovering: boolean): void {
		if (lastHoveringStateRef.current === hovering) return;

		lastHoveringStateRef.current = hovering;
		setIsHovered(hovering);
		setHoveredNode(hovering ? node : null);
	}

	function onPointerDown(event: React.PointerEvent<SVGSVGElement>): void {
		if (!moveNodeMode || event.button !== 0 || !svgViewport) return;

		event.preventDefault();
		event.stopPropagation();

		const pointerCoordinates = getSvgCoordinatesFromPointer(event.clientX, event.clientY, event.currentTarget);
		if (!pointerCoordinates) return;

		draggingRef.current = true;
		dragPointerIdRef.current = event.pointerId;
		dragOffsetRef.current = {
			x: node.x - pointerCoordinates.x,
			y: node.y - pointerCoordinates.y
		};

		suppressClicksRef && (suppressClicksRef.current = true);
		event.currentTarget.setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: React.PointerEvent<SVGSVGElement>): void {
		if (!draggingRef.current || !moveNodeMode || dragPointerIdRef.current !== event.pointerId || !svgViewport) return;

		event.preventDefault();
		event.stopPropagation();

		const pointerCoordinates = getSvgCoordinatesFromPointer(event.clientX, event.clientY, event.currentTarget);
		if (!pointerCoordinates) return;

		const nextX: number = clamp(dragOffsetRef.current.x + pointerCoordinates.x, 0, svgViewport.width);
		const nextY: number = clamp(dragOffsetRef.current.y + pointerCoordinates.y, 0, svgViewport.height);

		moveNode(node.id, nextX, nextY);
	}

	function finishDragging(event: React.PointerEvent<SVGSVGElement>): void {
		if (!draggingRef.current || dragPointerIdRef.current !== event.pointerId) return;

		event.preventDefault();
		event.stopPropagation();

		draggingRef.current = false;
		dragPointerIdRef.current = null;
		event.currentTarget.releasePointerCapture(event.pointerId);

		if (suppressClicksRef) {
			window.setTimeout(() => {
				suppressClicksRef.current = false;
			}, 0);
		}
	}

	return (
		<svg
			key={node.id}
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			style={{
				left: normalizedLeft,
				top: normalizedTop,
				position: "absolute",
				width: isSelected ? 192 : 128,
				height: isSelected ? 192 : 128,
				transform: "translate(-50%, -50%)",
				overflow: "hidden",
				cursor: moveNodeMode ? "move" : "pointer",
				zIndex: 1
			}}
			onMouseEnter={() => handleIsHoveredChange(true)}
			onMouseLeave={() => handleIsHoveredChange(false)}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={finishDragging}
			onPointerCancel={finishDragging}
		>
			<circle
				cx="50"
				cy="50"
				r="44"
				className={clsx("node", `${node.type}`, {
					selected: isSelected,
					hovered: isHovered
				})}
				onClick={(e) => {
					if (suppressClicksRef?.current) return;
					e.stopPropagation();
					onClick(node);
				}}
			/>
		</svg>
	);
}
