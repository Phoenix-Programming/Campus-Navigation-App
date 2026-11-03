import React from "react";
import { type Building, NodeType } from "../models/buildings_models";
import { Tool } from "../models/indoor_map_editor_models";
import addIcon from "@assets/icons/add.svg";
import editIcon from "@assets/icons/edit.svg";
import saveIcon from "@assets/icons/save.svg";
import "../styles/indoor-map-editor-header.scss";

interface IndoorMapEditorHeaderProps {
	buildings: Building[];
	selectedBuilding: Building | null;
	selectedFloor: number | null;
	selectedTool: Tool;
	nodeTypeToCreate: string;
	changesMade: boolean;
	onSelectedBuildingChange: (building: Building) => Promise<void>;
	onSelectedFloorChange: (floor: number) => Promise<void>;
	onNodeTypeChange: (value: string) => void;
	onCreateBuilding: () => void;
	onEditBuilding: () => void;
	onDiscard: () => void;
	onSave: () => void;
}

export default function IndoorMapEditorHeader({
	buildings,
	selectedBuilding,
	selectedFloor,
	selectedTool,
	nodeTypeToCreate,
	changesMade,
	onSelectedBuildingChange,
	onSelectedFloorChange,
	onNodeTypeChange,
	onCreateBuilding,
	onEditBuilding,
	onDiscard,
	onSave
}: IndoorMapEditorHeaderProps): React.JSX.Element {
	return (
		<div className="header-row">
			<div className="left-side">
				<div className="selector-container">
					<p>Building:</p>
					<select
						value={selectedBuilding?.code || ""}
						onChange={(event) => {
							const building = buildings.find((candidate) => candidate.code === event.target.value);
							if (building) void onSelectedBuildingChange(building);
						}}
						disabled={changesMade}
					>
						<option value="" disabled>
							---
						</option>

						{buildings.length > 0 &&
							buildings.map((building) => (
								<option key={building.code} value={building.code}>
									{building.code}
								</option>
							))}
					</select>
				</div>

				{selectedBuilding && (
					<div className="selector-container">
						<p>Floor:</p>
						<select
							value={selectedFloor || ""}
							onChange={(event) => {
								const floor = Number.parseInt(event.target.value, 10);
								if (!Number.isNaN(floor)) void onSelectedFloorChange(floor);
							}}
							disabled={changesMade}
						>
							<option value="" disabled>
								---
							</option>

							{Array.from({ length: selectedBuilding?.num_floors || 0 }, (_, index) => (
								<option key={index + 1} value={index + 1}>
									{index + 1}
								</option>
							))}
						</select>
					</div>
				)}

				{!selectedBuilding && (
					<button onClick={onCreateBuilding} className="outline-button secondary" type="button">
						<img src={addIcon} alt="create icon" />
						Create Building
					</button>
				)}

				{selectedBuilding && (
					<button
						onClick={onEditBuilding}
						disabled={selectedBuilding === null || changesMade}
						className="outline-button secondary"
						type="button"
					>
						<img src={editIcon} alt="edit icon" />
						Edit Building
					</button>
				)}
			</div>

			{selectedTool === Tool.CreateNode && (
				<div className="selector-container">
					<p>New Node's Type:</p>
					<select value={nodeTypeToCreate} onChange={(event) => onNodeTypeChange(event.target.value)}>
						{Object.values(NodeType).map((type) => (
							<option key={type} value={type}>
								{type.charAt(0).toUpperCase() + type.slice(1)}
							</option>
						))}
					</select>
				</div>
			)}

			<div className="right-side">
				<button onClick={onDiscard} disabled={!changesMade} className="outline-button danger" type="button">
					Discard
				</button>

				<button onClick={onSave} disabled={!changesMade} className="button primary" type="button">
					<img src={saveIcon} alt="save icon" />
					Save
				</button>
			</div>
		</div>
	);
}
