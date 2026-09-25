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
	onNodeClick: (node: Node) => void;
	setHoveredNode: (node: Node | null) => void;
}

export default function NodeComponent({ node, isSelected, onNodeClick, setHoveredNode }: NodeComponentProps): React.JSX.Element {
	const [isHovered, setIsHovered] = useState<boolean>(false);

	const lastHoveringStateRef = useRef<boolean>(false);

	const svgViewportContext = useContext(SvgViewportContext);

	const svgViewport: SvgViewportMetrics | null = svgViewportContext;
	const suppressClicksRef = svgViewportContext?.suppressClicksRef;
	const normalizedLeft: string = svgViewport ? `${(node.x / svgViewport.width) * 100}%` : `${node.x}px`;
	const normalizedTop: string = svgViewport ? `${(node.y / svgViewport.height) * 100}%` : `${node.y}px`;


	function onClick(node: Node): void {
		onNodeClick(node);
	}

	function handleIsHoveredChange(hovering: boolean): void {
		if (lastHoveringStateRef.current === hovering) return;

		lastHoveringStateRef.current = hovering;
		setIsHovered(hovering);
		setHoveredNode(hovering ? node : null);
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
				cursor: "pointer",
				zIndex: 1
			}}
			onMouseEnter={() => handleIsHoveredChange(true)}
			onMouseLeave={() => handleIsHoveredChange(false)}
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
