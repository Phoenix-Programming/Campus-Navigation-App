import React, { useContext } from "react";
import { clsx } from "clsx";
import { Tool } from "./IndoorMapEditorToolbar";
import { type Node } from "./NodeComponent";
import { SvgViewportContext, type SvgViewportMetrics } from "./SvgViewerComponent";
import "@styles/components/edge-component.scss";

export interface Edge {
	id: string;
	sourceNodeId: string;
	targetNodeId: string;
}

export function isEdge(item: Node | Edge): item is Edge {
	return "sourceNodeId" in item && "targetNodeId" in item;
}

interface EdgeComponentProps {
	edge: Edge;
	sourceNode: Node;
	targetNode: Node;
	isSelected?: boolean;
	selectedTool?: Tool;
	onEdgeClick?: (edge: Edge) => void;
}

export default function EdgeComponent({
	edge,
	sourceNode,
	targetNode,
	isSelected,
	selectedTool,
	onEdgeClick
}: EdgeComponentProps): React.JSX.Element | null {
	const svgViewportContext = useContext(SvgViewportContext);

	const svgViewport: SvgViewportMetrics | null = svgViewportContext;
	const suppressClicksRef = svgViewportContext?.suppressClicksRef;

	if (!svgViewport) return null;

	const toCoordinate = (value: number, size?: number): string => {
		if (size && size > 0) return `${(value / size) * 100}%`;

		return `${value}px`;
	};

	const x1: string = toCoordinate(sourceNode.x, svgViewport?.width);
	const y1: string = toCoordinate(sourceNode.y, svgViewport?.height);
	const x2: string = toCoordinate(targetNode.x, svgViewport?.width);
	const y2: string = toCoordinate(targetNode.y, svgViewport?.height);

	const getEdgeCursor = (): string => {
		switch (selectedTool) {
			case Tool.SingleSelect:
			case Tool.MultiSelect:
				return "pointer";
			default:
				return "move";
		}
	};

	return (
		<svg
			key={edge.id}
			style={{
				position: "absolute",
				left: 0,
				top: 0,
				width: "100%",
				height: "100%",
				overflow: "visible",
				pointerEvents: "none",
				zIndex: 0
			}}
		>
			<line
				x1={x1}
				y1={y1}
				x2={x2}
				y2={y2}
				className={clsx("edge", { selected: isSelected })}
				style={{ pointerEvents: "stroke", cursor: getEdgeCursor() }}
				onClick={(e) => {
					if (suppressClicksRef?.current) return;
					e.stopPropagation();
					onEdgeClick?.(edge);
				}}
			/>
		</svg>
	);
}
