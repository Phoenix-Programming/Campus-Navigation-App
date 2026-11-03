import React from "react";
import clsx from "clsx";
import "../styles/map-legend.scss";

export interface MapLegendItem {
	icon: string;
	label: string;
	className: string;
}

interface MapLegendProps {
	items: MapLegendItem[];
}

export default function MapLegend({ items }: MapLegendProps): React.JSX.Element {
	return (
		<div className="key-container">
			<span className="key-title">Key</span>
			{items.map((item, index) => (
				<div key={`${item.label}-${index}`} className="key-item">
					<img src={item.icon} alt={item.label} className={clsx("key-icon", item.className)} />
					<span>{item.label}</span>
				</div>
			))}
		</div>
	);
}
