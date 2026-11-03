import { useCallback, useState } from "react";
import { type Node, type Edge } from "../models/buildings_models";
import { Tool } from "../models/indoor_map_editor_models";
import { isEdge } from "../components/EdgeComponent";
import { isNode } from "../components/NodeComponent";

interface UseMapSelectionArgs {
	nodes: Node[] | null;
	edges: Edge[] | null;
	selectedTool: Tool;
	setChangesMade: (value: boolean | ((previous: boolean) => boolean)) => void;
	makeConnection: (sourceNode: Node, targetNode: Node) => void;
	deleteEdge: (nodeIdA: number, nodeIdB: number) => void;
	nodesHaveConnection: (nodeA: Node, nodeB: Node) => boolean;
}

export function useMapSelection({
	nodes,
	edges,
	selectedTool,
	setChangesMade,
	makeConnection,
	deleteEdge,
	nodesHaveConnection
}: UseMapSelectionArgs) {
	const [selectedNode, setSelectedNode] = useState<Node | null>(null);
	const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
	const [selectedNodesAndEdges, setSelectedNodesAndEdges] = useState<Set<Node | Edge>>(new Set<Node | Edge>());
	const [hoveredNode, setHoveredNode] = useState<Node | null>(null);
	const [hoveredEdge, setHoveredEdge] = useState<Edge | null>(null);

	const isNodeSelected = useCallback(
		(node: Node): boolean =>
			selectedNode?.id === node.id ||
			Array.from(selectedNodesAndEdges).filter((n) => isNode(n) && n.id === node.id).length > 0,
		[selectedNode, selectedNodesAndEdges]
	);

	const isEdgeSelected = useCallback(
		(edge: Edge): boolean =>
			selectedEdge?.id === edge.id ||
			Array.from(selectedNodesAndEdges).filter((e) => isEdge(e) && e.id === edge.id).length > 0,
		[selectedEdge, selectedNodesAndEdges]
	);

	const deleteSelectedItems = useCallback(() => {
		if (!nodes || !edges) return;

		const selectedNodeIds = new Set<number>();
		const selectedEdgeIds = new Set<string>();

		if (selectedNode) selectedNodeIds.add(selectedNode.id);
		if (selectedEdge) selectedEdgeIds.add(selectedEdge.id);

		for (const item of selectedNodesAndEdges) {
			if (isNode(item)) selectedNodeIds.add(item.id);
			if (isEdge(item)) selectedEdgeIds.add(item.id);
		}

		if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) return;

		const nextNodes = nodes.filter((node) => !selectedNodeIds.has(node.id));
		const nextEdges = edges.filter((edge) => {
			if (selectedNodeIds.has(edge.source_node_id) || selectedNodeIds.has(edge.target_node_id)) return false;
			return !selectedEdgeIds.has(edge.id);
		});

		setSelectedNode(null);
		setSelectedEdge(null);
		setSelectedNodesAndEdges(new Set<Node | Edge>());
		setHoveredNode((prevNode) => (prevNode && selectedNodeIds.has(prevNode.id) ? null : prevNode));
		setHoveredEdge((prevEdge) => {
			if (!prevEdge) return prevEdge;
			const deletedWithNode =
				selectedNodeIds.has(prevEdge.source_node_id) || selectedNodeIds.has(prevEdge.target_node_id);
			if (deletedWithNode) return null;
			return selectedEdgeIds.has(prevEdge.id) ? null : prevEdge;
		});

		// Derived mutation is handled by the page-level state setters passed in.
		setChangesMade(true);
		return { nextNodes, nextEdges };
	}, [edges, nodes, selectedEdge, selectedNode, selectedNodesAndEdges, setChangesMade]);

	const onHoveredNodeChange = useCallback((node: Node | null): void => {
		setHoveredNode((prevNode) => (prevNode?.id === node?.id ? prevNode : node));
	}, []);

	const onHoveredEdgeChange = useCallback((edge: Edge | null): void => {
		setHoveredEdge((prevEdge) => (prevEdge?.id === edge?.id ? prevEdge : edge));
	}, []);

	const handleNodeClickSingleSelectTool = useCallback(
		(node: Node): void => {
			if (selectedNode === node) setSelectedNode(null);
			else setSelectedNode(node);
			setSelectedEdge(null);
		},
		[selectedNode]
	);

	const handleNodeClickMultiSelectTool = useCallback(
		(node: Node): void => {
			if (!selectedNodesAndEdges.has(node)) {
				setSelectedNodesAndEdges(new Set(selectedNodesAndEdges).add(node));
				return;
			}

			const nextSet = new Set(selectedNodesAndEdges);
			nextSet.delete(node);
			setSelectedNodesAndEdges(nextSet);
		},
		[selectedNodesAndEdges]
	);

	const handleNodeClickSingleConnectTool = useCallback(
		(node: Node): void => {
			if (selectedNode === null) return setSelectedNode(node);
			if (selectedNode.id === node.id) return setSelectedNode(null);

			if (nodesHaveConnection(selectedNode, node)) {
				deleteEdge(selectedNode.id, node.id);
				setSelectedNode(null);
				return;
			}

			makeConnection(selectedNode, node);
			setSelectedNode(null);
		},
		[deleteEdge, makeConnection, nodesHaveConnection, selectedNode]
	);

	const handleNodeClickMultiConnectTool = useCallback(
		(node: Node): void => {
			if (selectedNode === null) return setSelectedNode(node);
			if (selectedNode.id === node.id) return setSelectedNode(null);

			if (nodesHaveConnection(selectedNode, node)) deleteEdge(selectedNode.id, node.id);
			else makeConnection(selectedNode, node);
		},
		[deleteEdge, makeConnection, nodesHaveConnection, selectedNode]
	);

	const handleEdgeClickSingleSelectTool = useCallback(
		(edge: Edge): void => {
			if (selectedEdge === edge) setSelectedEdge(null);
			else setSelectedEdge(edge);
			setSelectedNode(null);
		},
		[selectedEdge]
	);

	const handleEdgeClickMultiSelectTool = useCallback(
		(edge: Edge): void => {
			if (!selectedNodesAndEdges.has(edge)) {
				setSelectedNodesAndEdges(new Set(selectedNodesAndEdges).add(edge));
				return;
			}

			const nextSet = new Set(selectedNodesAndEdges);
			nextSet.delete(edge);
			setSelectedNodesAndEdges(nextSet);
		},
		[selectedNodesAndEdges]
	);

	const onNodeClick = useCallback(
		(node: Node): void => {
			switch (selectedTool) {
				case Tool.SingleSelect:
					handleNodeClickSingleSelectTool(node);
					break;
				case Tool.MultiSelect:
					handleNodeClickMultiSelectTool(node);
					break;
				case Tool.SingleConnect:
					handleNodeClickSingleConnectTool(node);
					break;
				case Tool.MultiConnect:
					handleNodeClickMultiConnectTool(node);
					break;
			}
		},
		[
			handleNodeClickMultiConnectTool,
			handleNodeClickMultiSelectTool,
			handleNodeClickSingleConnectTool,
			handleNodeClickSingleSelectTool,
			selectedTool
		]
	);

	const onEdgeClick = useCallback(
		(edge: Edge): void => {
			switch (selectedTool) {
				case Tool.SingleSelect:
					handleEdgeClickSingleSelectTool(edge);
					break;
				case Tool.MultiSelect:
					handleEdgeClickMultiSelectTool(edge);
					break;
			}
		},
		[handleEdgeClickMultiSelectTool, handleEdgeClickSingleSelectTool, selectedTool]
	);

	return {
		selectedNode,
		setSelectedNode,
		selectedEdge,
		setSelectedEdge,
		selectedNodesAndEdges,
		setSelectedNodesAndEdges,
		hoveredNode,
		setHoveredNode,
		hoveredEdge,
		setHoveredEdge,
		isNodeSelected,
		isEdgeSelected,
		deleteSelectedItems,
		onNodeClick,
		onEdgeClick,
		onHoveredNodeChange,
		onHoveredEdgeChange
	};
}
