import React from "react";
import { ClickableAreaTool } from "../models/indoor_map_editor_models";
import selectIcon from "@assets/icons/select.svg";
import moveIcon from "@assets/icons/move.svg";
import addIcon from "@assets/icons/add.svg";
import removeIcon from "@assets/icons/remove.svg";
import deleteIcon from "@assets/icons/delete.svg";
import "../styles/indoor-map-editor-toolbar.scss";

interface ClickableAreaToolbarProps {
	selectedTool: ClickableAreaTool;
	onToolChange: (tool: ClickableAreaTool) => void;
	onDeleteArea: () => void;
	canMovePoints: boolean;
	canAddPoint: boolean;
	canDeletePoint: boolean;
	canDeleteArea: boolean;
}

const toolButtons = [
	{ tool: ClickableAreaTool.SelectNode, icon: selectIcon, label: "Select Node" },
	{ tool: ClickableAreaTool.MovePoints, icon: moveIcon, label: "Move Points" },
	{ tool: ClickableAreaTool.AddPoint, icon: addIcon, label: "Add Point" },
	{ tool: ClickableAreaTool.DeletePoint, icon: removeIcon, label: "Delete Point" }
];

export default function ClickableAreaToolbar({
	selectedTool,
	onToolChange,
	onDeleteArea,
	canMovePoints,
	canAddPoint,
	canDeletePoint,
	canDeleteArea
}: ClickableAreaToolbarProps): React.JSX.Element {
	return (
		<div className="toolbar clickable-area-toolbar">
			<div className="buttons-container">
				<div className="tool-buttons">
					{toolButtons.map(({ tool, icon, label }) => {
						const isMoveTool: boolean = tool === ClickableAreaTool.MovePoints;
						const isAddTool: boolean = tool === ClickableAreaTool.AddPoint;
						const isDeletePointTool: boolean = tool === ClickableAreaTool.DeletePoint;
						const isDisabled: boolean =
							(isMoveTool && !canMovePoints) || (isAddTool && !canAddPoint) || (isDeletePointTool && !canDeletePoint);

						return (
							<button
								key={tool}
								type="button"
								className={selectedTool === tool ? "tool-button selected" : "tool-button"}
								onClick={() => onToolChange(tool)}
								disabled={isDisabled}
								aria-label={label}
								title={label}
							>
								<img src={icon} alt="" />
							</button>
						);
					})}
				</div>

				<hr className="separator-line" />

				<div className="action-buttons">
					<button
						type="button"
						className="icon-button danger"
						onClick={onDeleteArea}
						disabled={!canDeleteArea}
						aria-label="Delete Clickable Area"
						title="Delete Clickable Area"
					>
						<img src={deleteIcon} alt="" />
					</button>
				</div>
			</div>
		</div>
	);
}
