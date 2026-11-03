import React, { useCallback, useMemo, useRef, useState } from "react";
import { type Node } from "../models/buildings_models";
import { ClickableAreaTool, Tool } from "../models/indoor_map_editor_models";
import { type SvgMapCoordinates } from "../models/svg_viewer_models";
import { canFinalizeClickableArea, getClosestEdgeInsertIndexForPoint } from "../utils/clickable_area";

interface UseClickableAreaEditorArgs {
	nodes: Node[] | null;
	setNodes: React.Dispatch<React.SetStateAction<Node[] | null>>;
	selectedNode: Node | null;
	selectedTool: Tool;
	svgDimensions: { width: number; height: number };
	setChangesMade: (value: boolean | ((previous: boolean) => boolean)) => void;
	mapContainerRef: React.RefObject<HTMLDivElement | null>;
	onSelectedNodeChange?: (node: Node | null) => void;
	onCreateNode?: (coordinates: SvgMapCoordinates) => void;
}

export function useClickableAreaEditor({
	nodes,
	setNodes,
	selectedNode,
	selectedTool,
	svgDimensions,
	setChangesMade,
	mapContainerRef,
	onSelectedNodeChange,
	onCreateNode
}: UseClickableAreaEditorArgs) {
	const [clickableAreaEditingNodeId, setClickableAreaEditingNodeId] = useState<number | null>(null);
	const [selectedClickableAreaTool, setSelectedClickableAreaTool] = useState<ClickableAreaTool>(
		ClickableAreaTool.SelectNode
	);
	const [clickableAreaDraftPoints, setClickableAreaDraftPoints] = useState<SvgMapCoordinates[]>([]);
	const [clickableAreaCursorPosition, setClickableAreaCursorPosition] = useState<SvgMapCoordinates | null>(null);
	const draggedClickableAreaPointRef = useRef<{ nodeId: number; pointIndex: number } | null>(null);

	const getSelectedClickableAreaNode = useCallback((): Node | null => {
		if (!selectedNode || clickableAreaEditingNodeId !== selectedNode.id) return null;
		return selectedNode;
	}, [clickableAreaEditingNodeId, selectedNode]);

	const cancelClickableAreaEdit = useCallback((): void => {
		setClickableAreaDraftPoints([]);
		setClickableAreaCursorPosition(null);
	}, []);

	const deleteClickableArea = useCallback(
		(nodeId: number): void => {
			const nextNodes = nodes?.map((node) => (node.id === nodeId ? { ...node, clickable_area: null } : node)) ?? null;
			if (nextNodes) setNodes(nextNodes);
			if (nextNodes) {
				const nextSelectedNode = nextNodes.find((node) => node.id === nodeId) ?? null;
				if (onSelectedNodeChange) onSelectedNodeChange(nextSelectedNode);
			}
			setClickableAreaDraftPoints([]);
			setClickableAreaCursorPosition(null);
			setChangesMade(true);
		},
		[nodes, onSelectedNodeChange, setChangesMade, setNodes]
	);

	const upsertNodeClickableArea = useCallback(
		(nodeId: number, nextPoints: { x: number; y: number }[] | null): void => {
			if (!nodes) return;
			const nextNodes = nodes.map((node) => (node.id === nodeId ? { ...node, clickable_area: nextPoints } : node));
			setNodes(nextNodes);
			const nextSelectedNode = nextNodes.find((node) => node.id === nodeId) ?? null;
			if (onSelectedNodeChange) onSelectedNodeChange(nextSelectedNode);
			setChangesMade(true);
		},
		[nodes, onSelectedNodeChange, setChangesMade, setNodes]
	);

	const finalizeClickableArea = useCallback((): void => {
		if (clickableAreaEditingNodeId === null || !canFinalizeClickableArea(clickableAreaDraftPoints)) return;
		const finalizedArea = clickableAreaDraftPoints.map((point) => ({ x: point.x, y: point.y }));
		setNodes(
			(prevNodes) =>
				(prevNodes ?? nodes)?.map((node) =>
					node.id === clickableAreaEditingNodeId ? { ...node, clickable_area: finalizedArea } : node
				) ?? null
		);
		const updatedNode =
			(selectedNode && selectedNode.id === clickableAreaEditingNodeId
				? { ...selectedNode, clickable_area: finalizedArea }
				: (nodes?.find((node) => node.id === clickableAreaEditingNodeId) ?? null)) ?? null;
		if (updatedNode) onSelectedNodeChange?.(updatedNode);
		cancelClickableAreaEdit();
		setChangesMade(true);
	}, [
		cancelClickableAreaEdit,
		clickableAreaDraftPoints,
		clickableAreaEditingNodeId,
		nodes,
		onSelectedNodeChange,
		selectedNode,
		setChangesMade,
		setNodes
	]);

	const onClickableAreaToolChange = useCallback(
		(tool: ClickableAreaTool): void => {
			const selectedEditableNode = getSelectedClickableAreaNode();
			if (tool === ClickableAreaTool.MovePoints && !selectedEditableNode?.clickable_area?.length) return;
			if (
				tool === ClickableAreaTool.AddPoint &&
				(!selectedEditableNode?.clickable_area || selectedEditableNode.clickable_area.length < 3)
			)
				return;
			if (
				tool === ClickableAreaTool.DeletePoint &&
				(!selectedEditableNode?.clickable_area || selectedEditableNode.clickable_area.length <= 3)
			)
				return;
			setSelectedClickableAreaTool(tool);
			draggedClickableAreaPointRef.current = null;
		},
		[getSelectedClickableAreaNode]
	);

	const onDeleteClickableAreaActionClick = useCallback((): void => {
		const selectedEditableNode = getSelectedClickableAreaNode();
		if (!selectedEditableNode?.clickable_area?.length) return;
		deleteClickableArea(selectedEditableNode.id);
		setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
		draggedClickableAreaPointRef.current = null;
	}, [deleteClickableArea, getSelectedClickableAreaNode]);

	const getSvgCoordinatesFromPointerEvent = useCallback(
		(event: React.PointerEvent<SVGCircleElement>): { x: number; y: number } | null => {
			if (svgDimensions.width <= 0 || svgDimensions.height <= 0) return null;
			const imageElement: Element | null = mapContainerRef.current?.querySelector(".viewer img") ?? null;
			const viewerElement: Element | null = mapContainerRef.current?.querySelector(".viewer") ?? null;
			const renderRect: DOMRect | null =
				imageElement instanceof HTMLElement
					? imageElement.getBoundingClientRect()
					: viewerElement instanceof HTMLElement
						? viewerElement.getBoundingClientRect()
						: null;
			if (!renderRect || renderRect.width <= 0 || renderRect.height <= 0) return null;
			const normalizedX = (event.clientX - renderRect.left) / renderRect.width;
			const normalizedY = (event.clientY - renderRect.top) / renderRect.height;
			if (!Number.isFinite(normalizedX) || !Number.isFinite(normalizedY)) return null;
			return {
				x: Math.min(Math.max(normalizedX * svgDimensions.width, 0), svgDimensions.width),
				y: Math.min(Math.max(normalizedY * svgDimensions.height, 0), svgDimensions.height)
			};
		},
		[mapContainerRef, svgDimensions.height, svgDimensions.width]
	);

	const onClickableAreaPointPointerDown = useCallback(
		(event: React.PointerEvent<SVGCircleElement>, nodeId: number, pointIndex: number): void => {
			if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.MovePoints) return;
			if (clickableAreaEditingNodeId !== nodeId) return;
			event.preventDefault();
			event.stopPropagation();
			draggedClickableAreaPointRef.current = { nodeId, pointIndex };
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		[clickableAreaEditingNodeId, selectedClickableAreaTool, selectedTool]
	);

	const onClickableAreaPointMouseDown = useCallback(
		(event: React.MouseEvent<SVGCircleElement>): void => {
			if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.MovePoints) return;
			event.preventDefault();
			event.stopPropagation();
		},
		[selectedClickableAreaTool, selectedTool]
	);

	const onClickableAreaPointPointerMove = useCallback(
		(event: React.PointerEvent<SVGCircleElement>): void => {
			const activeDrag = draggedClickableAreaPointRef.current;
			if (!activeDrag) return;
			event.preventDefault();
			event.stopPropagation();
			const nextCoordinates = getSvgCoordinatesFromPointerEvent(event);
			if (!nextCoordinates) return;
			const selectedEditableNode = getSelectedClickableAreaNode();
			if (!selectedEditableNode?.clickable_area || selectedEditableNode.id !== activeDrag.nodeId) return;
			const nextPoints = selectedEditableNode.clickable_area.map((point, index) =>
				index === activeDrag.pointIndex ? { ...point, x: nextCoordinates.x, y: nextCoordinates.y } : point
			);
			upsertNodeClickableArea(activeDrag.nodeId, nextPoints);
			setChangesMade(true);
		},
		[getSelectedClickableAreaNode, getSvgCoordinatesFromPointerEvent, setChangesMade, upsertNodeClickableArea]
	);

	const onClickableAreaPointPointerUp = useCallback((event: React.PointerEvent<SVGCircleElement>): void => {
		if (draggedClickableAreaPointRef.current) {
			event.preventDefault();
			event.stopPropagation();
			draggedClickableAreaPointRef.current = null;
		}
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
	}, []);

	const onClickableAreaPointClick = useCallback(
		(event: React.MouseEvent<SVGCircleElement>, nodeId: number, pointIndex: number): void => {
			if (selectedTool !== Tool.EditClickableArea || selectedClickableAreaTool !== ClickableAreaTool.DeletePoint)
				return;
			if (clickableAreaEditingNodeId !== nodeId) return;
			event.preventDefault();
			event.stopPropagation();
			const selectedEditableNode = getSelectedClickableAreaNode();
			const points = selectedEditableNode?.clickable_area;
			if (!points || points.length <= 3) return;
			const nextPoints = points.filter((_, index) => index !== pointIndex);
			upsertNodeClickableArea(nodeId, nextPoints);
			if (nextPoints.length <= 3) setSelectedClickableAreaTool(ClickableAreaTool.SelectNode);
			setChangesMade(true);
		},
		[
			clickableAreaEditingNodeId,
			getSelectedClickableAreaNode,
			selectedClickableAreaTool,
			selectedTool,
			setChangesMade,
			upsertNodeClickableArea
		]
	);

	const handleNodeClickEditClickableArea = useCallback(
		(node: Node): void => {
			if (selectedClickableAreaTool !== ClickableAreaTool.SelectNode) return;
			if (clickableAreaEditingNodeId === node.id) {
				cancelClickableAreaEdit();
				setClickableAreaEditingNodeId(null);
				if (onSelectedNodeChange) onSelectedNodeChange(null);
				return;
			}
			if (onSelectedNodeChange) onSelectedNodeChange(node);
			setClickableAreaEditingNodeId(node.id);
			setClickableAreaDraftPoints([]);
			setClickableAreaCursorPosition(null);
		},
		[cancelClickableAreaEdit, clickableAreaEditingNodeId, onSelectedNodeChange, selectedClickableAreaTool]
	);

	const onMapClick = useCallback(
		(coordinates: { x: number; y: number } | null): void => {
			if (selectedTool === Tool.CreateNode && coordinates) {
				onCreateNode?.(coordinates);
				return;
			}
			if (
				selectedTool === Tool.EditClickableArea &&
				selectedClickableAreaTool === ClickableAreaTool.AddPoint &&
				coordinates
			) {
				const selectedEditableNode = getSelectedClickableAreaNode();
				const points = selectedEditableNode?.clickable_area;
				if (!selectedEditableNode || !points || points.length < 3) return;
				const insertIndex = getClosestEdgeInsertIndexForPoint(points, coordinates);
				const nextPoints = [...points.slice(0, insertIndex), coordinates, ...points.slice(insertIndex)];
				upsertNodeClickableArea(selectedEditableNode.id, nextPoints);
				setChangesMade(true);
				return;
			}
			if (
				selectedTool === Tool.EditClickableArea &&
				selectedClickableAreaTool === ClickableAreaTool.SelectNode &&
				coordinates &&
				clickableAreaEditingNodeId !== null
			) {
				const editingNode = nodes?.find((node) => node.id === clickableAreaEditingNodeId);
				if (!editingNode || editingNode.clickable_area?.length) return;
				const nextPoint = { x: coordinates.x, y: coordinates.y };
				setClickableAreaDraftPoints((prev) => {
					if (
						prev.some((point) => Math.abs(point.x - nextPoint.x) < 0.001 && Math.abs(point.y - nextPoint.y) < 0.001)
					) {
						return prev;
					}
					return [...prev, nextPoint];
				});
			}
		},
		[
			clickableAreaEditingNodeId,
			getSelectedClickableAreaNode,
			nodes,
			onCreateNode,
			selectedClickableAreaTool,
			selectedTool,
			setChangesMade,
			upsertNodeClickableArea
		]
	);

	const onMapMouseMove = useCallback(
		(coordinates: SvgMapCoordinates | null): void => {
			if (
				selectedTool !== Tool.EditClickableArea ||
				selectedClickableAreaTool !== ClickableAreaTool.SelectNode ||
				clickableAreaEditingNodeId === null
			) {
				setClickableAreaCursorPosition(null);
				return;
			}
			const editingNode = nodes?.find((node) => node.id === clickableAreaEditingNodeId);
			if (!editingNode || editingNode.clickable_area?.length) {
				setClickableAreaCursorPosition(null);
				return;
			}
			setClickableAreaCursorPosition(coordinates);
		},
		[clickableAreaEditingNodeId, nodes, selectedClickableAreaTool, selectedTool]
	);

	const onMapMouseLeave = useCallback((): void => {
		if (selectedTool === Tool.EditClickableArea) setClickableAreaCursorPosition(null);
	}, [selectedTool]);

	const selectedClickableAreaNode = getSelectedClickableAreaNode();
	const canMoveClickableAreaPoints = useMemo(
		() => Boolean(selectedClickableAreaNode?.clickable_area?.length),
		[selectedClickableAreaNode]
	);
	const canAddClickableAreaPoint = useMemo(
		() => Boolean(selectedClickableAreaNode?.clickable_area && selectedClickableAreaNode.clickable_area.length >= 3),
		[selectedClickableAreaNode]
	);
	const canDeleteClickableAreaPoint = useMemo(
		() => Boolean(selectedClickableAreaNode?.clickable_area && selectedClickableAreaNode.clickable_area.length > 3),
		[selectedClickableAreaNode]
	);
	const canDeleteClickableArea = useMemo(
		() => Boolean(selectedClickableAreaNode?.clickable_area?.length),
		[selectedClickableAreaNode]
	);

	return {
		clickableAreaEditingNodeId,
		setClickableAreaEditingNodeId,
		selectedClickableAreaTool,
		setSelectedClickableAreaTool,
		clickableAreaDraftPoints,
		setClickableAreaDraftPoints,
		clickableAreaCursorPosition,
		setClickableAreaCursorPosition,
		getSelectedClickableAreaNode,
		cancelClickableAreaEdit,
		handleNodeClickEditClickableArea,
		onMapClick,
		onMapMouseMove,
		onMapMouseLeave,
		onClickableAreaToolChange,
		onDeleteClickableAreaActionClick,
		onClickableAreaPointPointerDown,
		onClickableAreaPointPointerMove,
		onClickableAreaPointPointerUp,
		onClickableAreaPointMouseDown,
		onClickableAreaPointClick,
		finalizeClickableArea,
		deleteClickableArea,
		upsertNodeClickableArea,
		canMoveClickableAreaPoints,
		canAddClickableAreaPoint,
		canDeleteClickableAreaPoint,
		canDeleteClickableArea,
		draggedClickableAreaPointRef
	};
}
