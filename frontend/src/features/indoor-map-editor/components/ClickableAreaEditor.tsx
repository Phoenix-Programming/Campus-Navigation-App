import React from "react";
import { type Node } from "../models/buildings_models";
import "../styles/clickable-area-editor.scss";
import { ClickableAreaTool, Tool } from "../models/indoor_map_editor_models";
import { buildClickableAreaPoints, getNodeTypeHexColor, toRgba } from "../utils/clickable_area";

interface ClickableAreaEditorProps {
	selectedTool: Tool;
	nodes: Node[];
	svgDimensions: { width: number; height: number };
	clickableAreaEditingNodeId: number | null;
	clickableAreaDraftPoints: Array<{ x: number; y: number }>;
	clickableAreaCursorPosition: { x: number; y: number } | null;
	selectedClickableAreaTool: ClickableAreaTool;
	onClickableAreaPointPointerDown: (
		event: React.PointerEvent<SVGCircleElement>,
		nodeId: number,
		pointIndex: number
	) => void;
	onClickableAreaPointPointerMove: (event: React.PointerEvent<SVGCircleElement>) => void;
	onClickableAreaPointPointerUp: (event: React.PointerEvent<SVGCircleElement>) => void;
	onClickableAreaPointMouseDown: (event: React.MouseEvent<SVGCircleElement>) => void;
	onClickableAreaPointClick: (event: React.MouseEvent<SVGCircleElement>, nodeId: number, pointIndex: number) => void;
}

export default function ClickableAreaEditor({
	selectedTool,
	nodes,
	svgDimensions,
	clickableAreaEditingNodeId,
	clickableAreaDraftPoints,
	clickableAreaCursorPosition,
	selectedClickableAreaTool,
	onClickableAreaPointPointerDown,
	onClickableAreaPointPointerMove,
	onClickableAreaPointPointerUp,
	onClickableAreaPointMouseDown,
	onClickableAreaPointClick
}: ClickableAreaEditorProps): React.JSX.Element | null {
	if (selectedTool !== Tool.EditClickableArea) return null;

	return (
		<div className="clickable-area-overlay">
			<svg
				viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
				preserveAspectRatio="none"
				className="clickable-area-svg"
			>
				{nodes.map((node) => {
					const area = node.clickable_area;
					if (area && area.length >= 3) {
						return (
							<g key={node.id}>
								<polygon
									points={buildClickableAreaPoints(area)}
									fill={toRgba(getNodeTypeHexColor(node.type), 0.12)}
									stroke={toRgba(getNodeTypeHexColor(node.type), 0.45)}
									strokeWidth={0.5}
								/>
								{area.map((point, index) => (
									<circle
										key={`${node.id}-${index}`}
										cx={point.x}
										cy={point.y}
										r={
											(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
												selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
											clickableAreaEditingNodeId === node.id
												? 1.6
												: 1
										}
										fill="rgba(255, 255, 255, 0.8)"
										stroke="rgba(255, 255, 255, 0.9)"
										strokeWidth={0.5}
										style={{
											cursor:
												(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
													selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
												clickableAreaEditingNodeId === node.id
													? selectedClickableAreaTool === ClickableAreaTool.MovePoints
														? "move"
														: "pointer"
													: "default",
											pointerEvents:
												(selectedClickableAreaTool === ClickableAreaTool.MovePoints ||
													selectedClickableAreaTool === ClickableAreaTool.DeletePoint) &&
												clickableAreaEditingNodeId === node.id
													? "all"
													: "none"
										}}
										onPointerDown={(event) => onClickableAreaPointPointerDown(event, node.id, index)}
										onPointerMove={onClickableAreaPointPointerMove}
										onPointerUp={onClickableAreaPointPointerUp}
										onPointerCancel={onClickableAreaPointPointerUp}
										onMouseDown={onClickableAreaPointMouseDown}
										onClick={(event) => onClickableAreaPointClick(event, node.id, index)}
									/>
								))}
							</g>
						);
					}

					if (clickableAreaEditingNodeId === node.id) {
						const previewPoints = [
							...clickableAreaDraftPoints,
							...(clickableAreaCursorPosition ? [clickableAreaCursorPosition] : [])
						];

						if (previewPoints.length === 0) return null;

						return (
							<g key={node.id}>
								<polygon
									points={buildClickableAreaPoints(clickableAreaDraftPoints, clickableAreaCursorPosition)}
									fill={toRgba(getNodeTypeHexColor(node.type), 0.12)}
									stroke={toRgba(getNodeTypeHexColor(node.type), 0.45)}
									strokeWidth={0.5}
								/>
								{previewPoints.map((point, index) => (
									<circle
										key={`${node.id}-draft-${index}`}
										cx={point.x}
										cy={point.y}
										r={1}
										fill="rgba(255, 255, 255, 0.8)"
										stroke="rgba(255, 255, 255, 0.9)"
										strokeWidth={0.5}
									/>
								))}
							</g>
						);
					}

					return null;
				})}
			</svg>
		</div>
	);
}
