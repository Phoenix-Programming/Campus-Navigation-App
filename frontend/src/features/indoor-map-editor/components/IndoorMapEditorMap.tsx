import React from "react";
import { type Node, type Edge } from "../models/buildings_models";
import { ClickableAreaTool, Tool } from "../models/indoor_map_editor_models";
import { type SvgMapCoordinates, type SvgViewerHandle } from "../models/svg_viewer_models";
import EdgeComponent, { isEdge } from "./EdgeComponent";
import ClickableAreaEditor from "./ClickableAreaEditor";
import ClickableAreaToolbar from "./ClickableAreaToolbar";
import IndoorMapEditorToolbar from "./IndoorMapEditorToolbar";
import MapLegend from "./MapLegend";
import NodeComponent, { isNode } from "./NodeComponent";
import SvgViewerComponent from "./SvgViewerComponent";
import InspectorPanel from "./InspectorPanel";
import "../styles/indoor-map-editor-map.scss";
import { MAP_KEY_ITEMS } from "../utils/map_legend";

interface IndoorMapEditorMapProps {
	svgViewerRef: React.RefObject<SvgViewerHandle | null>;
	mapContainerRef: React.RefObject<HTMLDivElement | null>;
	svg: string;
	svgDimensions: { width: number; height: number };
	nodes: Node[];
	edges: Edge[];
	selectedTool: Tool;
	selectedNode: Node | null;
	selectedEdge: Edge | null;
	selectedNodesAndEdges: Set<Node | Edge>;
	hoveredNode: Node | null;
	hoveredEdge: Edge | null;
	selectedClickableAreaTool: ClickableAreaTool;
	clickableAreaEditingNodeId: number | null;
	clickableAreaDraftPoints: SvgMapCoordinates[];
	clickableAreaCursorPosition: SvgMapCoordinates | null;
	isShiftPressed: boolean;
	svgViewerZoomStep: number;
	canMoveClickableAreaPoints: boolean;
	canAddClickableAreaPoint: boolean;
	canDeleteClickableAreaPoint: boolean;
	canDeleteClickableArea: boolean;
	getToolHintText: () => string | null;
	onMapClick: (coordinates: { x: number; y: number } | null) => void;
	onMapMouseMove: (coordinates: SvgMapCoordinates | null) => void;
	onMapMouseLeave: () => void;
	onNodeClick: (node: Node) => void;
	onClickableAreaNodeSelect?: (node: Node) => void;
	onEdgeClick: (edge: Edge) => void;
	onHoveredNodeChange: (node: Node | null) => void;
	onHoveredEdgeChange: (edge: Edge | null) => void;
	onClickableAreaToolChange: (tool: ClickableAreaTool) => void;
	onDeleteClickableAreaActionClick: () => void;
	onClickableAreaPointPointerDown: (
		event: React.PointerEvent<SVGCircleElement>,
		nodeId: number,
		pointIndex: number
	) => void;
	onClickableAreaPointPointerMove: (event: React.PointerEvent<SVGCircleElement>) => void;
	onClickableAreaPointPointerUp: (event: React.PointerEvent<SVGCircleElement>) => void;
	onClickableAreaPointMouseDown: (event: React.MouseEvent<SVGCircleElement>) => void;
	onClickableAreaPointClick: (event: React.MouseEvent<SVGCircleElement>, nodeId: number, pointIndex: number) => void;
	onZoomIn: (zoomStep: number) => void;
	onZoomOut: (zoomStep: number) => void;
	onToolSelect: (tool: Tool) => void;
	moveNode: (nodeId: number, newX: number, newY: number) => void;
	isNodeSelected: (node: Node) => boolean;
	isEdgeSelected: (edge: Edge) => boolean;
	updateNode?: (nodeId: number, newLabel: string | null, newType: string | null) => void;
	deleteNode?: (nodeId: number) => void;
	deleteEdge?: (nodeAId: number, nodeBId: number) => void;
}

export default function IndoorMapEditorMap({
	svgViewerRef,
	mapContainerRef,
	svg,
	svgDimensions,
	nodes,
	edges,
	selectedTool,
	selectedNode,
	selectedEdge,
	selectedNodesAndEdges,
	hoveredNode,
	hoveredEdge,
	selectedClickableAreaTool,
	clickableAreaEditingNodeId,
	clickableAreaDraftPoints,
	clickableAreaCursorPosition,
	isShiftPressed,
	canMoveClickableAreaPoints,
	canAddClickableAreaPoint,
	canDeleteClickableAreaPoint,
	canDeleteClickableArea,
	getToolHintText,
	onMapClick,
	onMapMouseMove,
	onMapMouseLeave,
	onNodeClick,
	onClickableAreaNodeSelect,
	onEdgeClick,
	onHoveredNodeChange,
	onHoveredEdgeChange,
	onClickableAreaToolChange,
	onDeleteClickableAreaActionClick,
	onClickableAreaPointPointerDown,
	onClickableAreaPointPointerMove,
	onClickableAreaPointPointerUp,
	onClickableAreaPointMouseDown,
	onClickableAreaPointClick,
	onZoomIn,
	onZoomOut,
	onToolSelect,
	svgViewerZoomStep,
	moveNode,
	isNodeSelected,
	isEdgeSelected,
	updateNode,
	deleteNode,
	deleteEdge
}: IndoorMapEditorMapProps): React.JSX.Element {
	return (
		<div className="editor">
			<div ref={mapContainerRef} className="map">
				{getToolHintText() && (
					<div
						style={{
							position: "absolute",
							top: 12,
							left: "50%",
							transform: "translateX(-50%)",
							background: "rgba(0, 0, 0, 0.65)",
							color: "#fff",
							padding: "6px 10px",
							borderRadius: 8,
							fontSize: 12,
							lineHeight: 1.3,
							pointerEvents: "none",
							zIndex: 10
						}}
					>
						{getToolHintText()}
					</div>
				)}

				<SvgViewerComponent
					ref={svgViewerRef}
					svg={svg}
					allowPan={selectedTool !== Tool.CreateNode && (selectedTool !== Tool.MultiSelect || !isShiftPressed)}
					selectedTool={selectedTool}
					isClickableAreaDraftActive={clickableAreaEditingNodeId !== null}
					onMapClick={onMapClick}
					onMapMouseMove={onMapMouseMove}
					onMapMouseLeave={onMapMouseLeave}
				>
					<ClickableAreaEditor
						selectedTool={selectedTool}
						nodes={nodes}
						svgDimensions={svgDimensions}
						clickableAreaEditingNodeId={clickableAreaEditingNodeId}
						clickableAreaDraftPoints={clickableAreaDraftPoints}
						clickableAreaCursorPosition={clickableAreaCursorPosition}
						selectedClickableAreaTool={selectedClickableAreaTool}
						onClickableAreaPointPointerDown={onClickableAreaPointPointerDown}
						onClickableAreaPointPointerMove={onClickableAreaPointPointerMove}
						onClickableAreaPointPointerUp={onClickableAreaPointPointerUp}
						onClickableAreaPointMouseDown={onClickableAreaPointMouseDown}
						onClickableAreaPointClick={onClickableAreaPointClick}
					/>

					{edges.map((edge) => {
						const sourceNode = nodes.find((node) => node.id === edge.source_node_id);
						const targetNode = nodes.find((node) => node.id === edge.target_node_id);

						if (!sourceNode || !targetNode) return null;

						return (
							<EdgeComponent
								key={edge.id}
								edge={edge}
								sourceNode={sourceNode}
								targetNode={targetNode}
								isSelected={isEdgeSelected(edge)}
								selectedTool={selectedTool}
								onEdgeClick={onEdgeClick}
								setHoveredEdge={onHoveredEdgeChange}
							/>
						);
					})}

					{nodes.map((node) => (
						<NodeComponent
							key={node.id}
							node={node}
							isSelected={isNodeSelected(node)}
							selectedTool={selectedTool}
							onNodeClick={
								selectedTool === Tool.EditClickableArea ? (onClickableAreaNodeSelect ?? onNodeClick) : onNodeClick
							}
							setHoveredNode={onHoveredNodeChange}
							moveNode={moveNode}
						/>
					))}
				</SvgViewerComponent>
			</div>

			{selectedTool === Tool.EditClickableArea && (
				<div className="clickable-area-toolbar">
					<ClickableAreaToolbar
						selectedTool={selectedClickableAreaTool}
						onToolChange={onClickableAreaToolChange}
						onDeleteArea={onDeleteClickableAreaActionClick}
						canMovePoints={canMoveClickableAreaPoints}
						canAddPoint={canAddClickableAreaPoint}
						canDeletePoint={canDeleteClickableAreaPoint}
						canDeleteArea={canDeleteClickableArea}
					/>
				</div>
			)}

			<div className="toolbar">
				<IndoorMapEditorToolbar
					selectedTool={selectedTool}
					setSelectedTool={onToolSelect}
					zoomStep={svgViewerZoomStep}
					onZoomIn={onZoomIn}
					onZoomOut={onZoomOut}
				/>
			</div>

			<MapLegend items={MAP_KEY_ITEMS} />

			<InspectorPanel
				selectedNode={selectedNode}
				selectedEdge={selectedEdge}
				selectedNodesAndEdges={selectedNodesAndEdges}
				hoveredNode={hoveredNode}
				hoveredEdge={hoveredEdge}
				updateNode={updateNode}
				deleteNode={deleteNode}
				deleteEdge={deleteEdge}
			/>
		</div>
	);
}
