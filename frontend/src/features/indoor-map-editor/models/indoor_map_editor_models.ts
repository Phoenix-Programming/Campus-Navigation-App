import type { Node, Edge } from "./buildings_models";

export type DragSelectionMode = "select" | "deselect";

export enum Tool {
	SingleSelect,
	MultiSelect,
	SingleConnect,
	MultiConnect,
	MoveNode,
	CreateNode
}

export interface IndoorMapGraphUploadPayload {
	bld_code: string;
	floor_num: number;
	nodes: Node[];
	edges: Edge[];
}

export interface StagedIndoorMapGraphData {
	nodes: Node[];
	edges: Edge[];
}
