export interface ClickableAreaPoint {
	x: number;
	y: number;
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
