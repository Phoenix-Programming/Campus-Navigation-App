import React, { useContext, useRef, useState } from "react";
import { clsx } from "clsx";
import { type Edge } from "./EdgeComponent";
import { Tool } from "./IndoorMapEditorToolbar";
import { SvgViewportContext, type SvgViewportMetrics } from "./SvgViewerComponent";
import "@styles/components/node-component.scss";

export interface Node {
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
}

export function isNode(item: Node | Edge): item is Node {
	return "x" in item && "y" in item;
}

interface NodeComponentProps {
	node: Node;
	isSelected: boolean;
	selectedTool?: Tool;
	onNodeClick: (node: Node) => void;
	setHoveredNode: (node: Node | null) => void;
	moveNode: (nodeId: string, newX: number, newY: number) => void;
}

export default function NodeComponent({
	node,
	isSelected,
	selectedTool,
	onNodeClick,
	setHoveredNode,
	moveNode
}: NodeComponentProps): React.JSX.Element {
	const [isHovered, setIsHovered] = useState<boolean>(false);
	const [isDragging, setIsDragging] = useState<boolean>(false);

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

	function getNodeCursor(): string {
		switch (selectedTool) {
			case Tool.CreateNode: return "not-allowed";
			case Tool.MoveNode: return isDragging ? "grabbing" : isHovered ? "grab" : "default";
			case Tool.SingleSelect:
			case Tool.MultiSelect:
			case Tool.SingleConnect:
			case Tool.MultiConnect: return "pointer";
			default: return "move";
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
				cursor: getNodeCursor(),
				zIndex: 1
			}}
			onMouseEnter={() => handleIsHoveredChange(true)}
			onMouseLeave={() => {
				handleIsHoveredChange(false);
				setIsDragging(false);
			}}
			onMouseDown={(e) => {
				if (selectedTool === Tool.MoveNode) {
					e.stopPropagation();
					setIsDragging(true);
				}
			}}
			onMouseUp={() => setIsDragging(false)}
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
