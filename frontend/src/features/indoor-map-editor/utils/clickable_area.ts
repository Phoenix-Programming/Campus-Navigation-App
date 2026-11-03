import { NodeType } from "../models/buildings_models";

export interface ClickableAreaPoint {
	x: number;
	y: number;
}

export function getNodeTypeHexColor(nodeType: string): string {
	switch (nodeType) {
		case NodeType.room:
			return "#262aff";
		case NodeType.hallway:
			return "#21ff37";
		case NodeType.roomDoor:
			return "#ff2626";
		case NodeType.staircase:
			return "#ffa500";
		case NodeType.elevator:
			return "#ffff00";
		case NodeType.entranceExit:
			return "#543b2b";
		case NodeType.waterFountain:
			return "#00ffff";
		case NodeType.vending:
			return "#03690a";
		default:
			return "#262aff";
	}
}

export function toRgba(hex: string, alpha: number): string {
	const normalizedHex: string = hex.replace("#", "");
	const value: string =
		normalizedHex.length === 3
			? normalizedHex
					.split("")
					.map((char) => char + char)
					.join("")
			: normalizedHex;
	const intValue: number = Number.parseInt(value, 16);

	const red: number = (intValue >> 16) & 255;
	const green: number = (intValue >> 8) & 255;
	const blue: number = intValue & 255;

	return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function buildClickableAreaPoints(
	points: ClickableAreaPoint[],
	trailingPoint?: ClickableAreaPoint | null
): string {
	const visiblePoints: ClickableAreaPoint[] =
		trailingPoint !== undefined && trailingPoint !== null && points.length > 0 ? [...points, trailingPoint] : points;

	return visiblePoints
		.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
		.map((point) => `${Number(point.x.toFixed(3))},${Number(point.y.toFixed(3))}`)
		.join(" ");
}

export function canFinalizeClickableArea(points: ClickableAreaPoint[]): boolean {
	return points.length >= 3;
}

export function getClosestEdgeInsertIndexForPoint(
	points: { x: number; y: number }[],
	targetPoint: { x: number; y: number }
): number {
	let minDistanceSquared: number = Number.POSITIVE_INFINITY;
	let insertIndex: number = 1;

	for (let index = 0; index < points.length; index++) {
		const nextIndex: number = (index + 1) % points.length;
		const start = points[index];
		const end = points[nextIndex];
		const segmentDx: number = end.x - start.x;
		const segmentDy: number = end.y - start.y;
		const segmentLengthSquared: number = segmentDx * segmentDx + segmentDy * segmentDy;

		let projectionRatio: number = 0;
		if (segmentLengthSquared > 0) {
			const projectedNumerator: number = (targetPoint.x - start.x) * segmentDx + (targetPoint.y - start.y) * segmentDy;
			projectionRatio = Math.min(Math.max(projectedNumerator / segmentLengthSquared, 0), 1);
		}

		const projectedPointX: number = start.x + projectionRatio * segmentDx;
		const projectedPointY: number = start.y + projectionRatio * segmentDy;
		const dx: number = targetPoint.x - projectedPointX;
		const dy: number = targetPoint.y - projectedPointY;
		const distanceSquared: number = dx * dx + dy * dy;

		if (distanceSquared >= minDistanceSquared) continue;

		minDistanceSquared = distanceSquared;
		insertIndex = nextIndex;
	}

	return insertIndex;
}
