import type { SvgMapCoordinates } from "../models/svg_viewer_models";

export function getSvgDimensions(svg: string | null): { width: number; height: number } {
	const widthMatch: RegExpMatchArray | null = svg?.match(/width\s*=\s*["']([^"']+)["']/i) ?? null;
	const heightMatch: RegExpMatchArray | null = svg?.match(/height\s*=\s*["']([^"']+)["']/i) ?? null;
	const viewBoxMatch: RegExpMatchArray | null = svg?.match(/viewBox\s*=\s*["']([^"']+)["']/i) ?? null;

	if (widthMatch && heightMatch) {
		const width: number = Number.parseFloat(widthMatch[1]);
		const height: number = Number.parseFloat(heightMatch[1]);

		if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
			return { width, height };
		}
	}

	if (viewBoxMatch) {
		const parts: number[] = viewBoxMatch[1]
			.trim()
			.split(/[\s,]+/)
			.map(Number);

		if (parts.length >= 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3]) && parts[2] > 0 && parts[3] > 0) {
			return { width: parts[2], height: parts[3] };
		}
	}

	return { width: 100, height: 100 };
}

export function isEditableTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) return false;

	const editableTagNames: string[] = ["INPUT", "TEXTAREA"];
	return target.isContentEditable || editableTagNames.includes(target.tagName);
}

export function normalizeSvgPoint(
	coordinates: SvgMapCoordinates,
	svgDimensions: { width: number; height: number }
): SvgMapCoordinates {
	return {
		x: Math.min(Math.max(coordinates.x, 0), svgDimensions.width),
		y: Math.min(Math.max(coordinates.y, 0), svgDimensions.height)
	};
}
