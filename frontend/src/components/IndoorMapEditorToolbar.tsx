import React from "react";
import selectIcon from "../assets/icons/select.svg";
import selectBox from "../assets/icons/select-box.svg";
import linkIcon from "../assets/icons/link.svg";
import moveIcon from "../assets/icons/move.svg";
import addIcon from "../assets/icons/add.svg";
import zoomInIcon from "../assets/icons/zoom_in.svg";
import zoomOutIcon from "../assets/icons/zoom_out.svg";
import "@styles/components/indoor-map-editor-toolbar.scss";

export enum Tool {
	SingleSelect,
	MultiSelect,
	Connect,
	MoveNode,
	CreateNode
}

interface IndoorMapEditorToolbarProps {
	selectedTool: Tool;
	setSelectedTool: (tool: Tool) => void;
	zoomStep?: number;
	onZoomIn: (zoomStep: number) => void;
	onZoomOut: (zoomStep: number) => void;
}

const toolButtons = [
	{ tool: Tool.SingleSelect, icon: selectIcon, label: "Single Select" },
	{ tool: Tool.MultiSelect, icon: selectBox, label: "Multi Select" },
	{ tool: Tool.CreateNode, icon: addIcon, label: "Create Node" },
	{ tool: Tool.Connect, icon: linkIcon, label: "Connect Nodes" },
	{ tool: Tool.MoveNode, icon: moveIcon, label: "Move Node" }
];

export default function IndoorMapEditorToolbar({
	selectedTool,
	setSelectedTool,
	zoomStep = 0.1,
	onZoomIn,
	onZoomOut
}: IndoorMapEditorToolbarProps): React.JSX.Element {
	console.log("IndoorMapEditorToolbar Rerendering...");

	function onToolButtonClicked(tool: Tool): void {
		setSelectedTool(tool);
	}

	function onZoomInButtonClicked(): void {
		onZoomIn(zoomStep);
	}

	function onZoomOutButtonClicked(): void {
		onZoomOut(zoomStep);
	}

	return (
		<div className="toolbar">
			<div className="buttons-container">
				<div className="tool-buttons">
					{toolButtons.map(({ tool, icon, label }) => (
						<button
							key={tool}
							type="button"
							className={selectedTool === tool ? "tool-button selected" : "tool-button"}
							onClick={() => onToolButtonClicked(tool)}
							aria-label={label}
							title={label}
						>
							<img src={icon} alt="" />
						</button>
					))}
				</div>

				<hr className="separator-line" />

				<div className="action-buttons">
					<button
						type="button"
						className="icon-button"
						onClick={onZoomInButtonClicked}
						aria-label="Zoom In"
						title="Zoom In"
					>
						<img src={zoomInIcon} alt="" />
					</button>
					<button
						type="button"
						className="icon-button"
						onClick={onZoomOutButtonClicked}
						aria-label="Zoom Out"
						title="Zoom Out"
					>
						<img src={zoomOutIcon} alt="" />
					</button>
				</div>
			</div>
		</div>
	);
}
