import { useMemo } from "react";
import { getSvgDimensions } from "../utils/svg";

export function useSvgDimensions(svg: string | null): { width: number; height: number } {
	return useMemo(() => getSvgDimensions(svg), [svg]);
}
