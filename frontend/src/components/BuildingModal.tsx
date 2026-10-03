import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { format } from "numerable";
import ConfirmationModal from "./ConfirmationModal";
import api from "../api";
import closeIcon from "../assets/icons/close.svg";
import uploadIcon from "../assets/icons/upload.svg";
import { showError, showSuccess, showWarning } from "../services/notifications";
import "@styles/main.scss";
import "@styles/components/building-modal.scss";

interface BuildingData {
	category_type: string;
	name: string;
	code: string;
	address: string;
	num_floors: number;
	floor_svgs: { [floorNumber: number]: string };
}

interface BuildingCategoriesResponse {
	categories: string[];
}

interface BuildingModalProps {
	bld_id?: number;
	onClose: () => void;
}

export default function BuildingModal({ bld_id, onClose }: BuildingModalProps): React.JSX.Element {
	const [buildingCategoryTypes, setBuildingCategoryTypes] = useState<string[]>([]);
	const [buildingDataLoaded, setBuildingDataLoaded] = useState<boolean>(false);
	const [changesMade, setChangesMade] = useState<boolean>(false);
	const [buildingCategoryType, setBuildingCategoryType] = useState<string | null>(null);
	const [buildingName, setBuildingName] = useState<string>("");
	const [buildingCode, setBuildingCode] = useState<string>("");
	const [buildingAddress, setBuildingAddress] = useState<string>("");
	const [numFloors, setNumFloors] = useState<number>(1);
	const [floorSvgs, setFloorSvgs] = useState<{ [floorNumber: number]: string }>({});
	const [savePending, setSavePending] = useState<boolean>(false);
	const [createPending, setCreatePending] = useState<boolean>(false);
	const [discardPending, setDiscardPending] = useState<boolean>(false);
	const initialFormRef = useRef<{
		buildingCategoryType: string;
		buildingName: string;
		buildingCode: string;
		buildingAddress: string;
		numFloors: number;
		floorSvgs: { [floorNumber: number]: string };
	} | null>(null);

	useEffect(() => {
		const previousOverflow = document.body.style.overflow;

		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, []);

	useEffect(() => {
		getBuildingCategoryTypes();
	}, []);

	useEffect(() => {
		if (bld_id !== undefined) getBuildingData();
	}, [bld_id]);

	useEffect(() => {
		if (!buildingDataLoaded || !initialFormRef.current) return;

		setChangesMade(
			buildingCategoryType !== initialFormRef.current.buildingCategoryType ||
				buildingName !== initialFormRef.current.buildingName ||
				buildingCode !== initialFormRef.current.buildingCode ||
				buildingAddress !== initialFormRef.current.buildingAddress ||
				numFloors !== initialFormRef.current.numFloors ||
				JSON.stringify(floorSvgs) !== JSON.stringify(initialFormRef.current.floorSvgs)
		);
	}, [buildingDataLoaded, buildingCategoryType, buildingName, buildingCode, buildingAddress, numFloors, floorSvgs]);

	async function getBuildingCategoryTypes() {
		try {
			const response: BuildingCategoriesResponse = await api.get("/api/buildings/categories");
			setBuildingCategoryTypes(response.categories);
		} catch (error) {
			console.error("Error fetching building category types:", error);
			showError(
				error instanceof Error ? error.message : "Unable to load building categories. Please close this window and try again.",
				"Failed to Load Building Categories"
			);
		}
	}

	async function getBuildingData() {
		try {
			const response: BuildingData = (await api.get<BuildingData>(`/api/buildings/${bld_id}`)).data;

			setBuildingCategoryType(response.category_type);
			setBuildingName(response.name);
			setBuildingCode(response.code);
			setBuildingAddress(response.address);
			setNumFloors(response.num_floors);
			setFloorSvgs(response.floor_svgs);

			initialFormRef.current = {
				buildingCategoryType: response.category_type,
				buildingName: response.name,
				buildingCode: response.code,
				buildingAddress: response.address,
				numFloors: response.num_floors,
				floorSvgs: response.floor_svgs
			};

			setChangesMade(false);
			setBuildingDataLoaded(true);
		} catch (error) {
			console.error("Error fetching building data:", error);
			showError(
				error instanceof Error ? error.message : "Unable to load the building details.",
				"Failed to Load Building Details"
			);
		}
	}

	async function saveChanges() {
		try {
			if (!requiredFieldsFilled()) {
				showWarning("Please complete all required building details before saving.", "Incomplete Building Form");
				return;
			}

			await api.put(`/api/buildings/${bld_id}`, {
				category_type: buildingCategoryType,
				name: buildingName,
				code: buildingCode,
				address: buildingAddress,
				num_floors: numFloors,
				floor_svgs: floorSvgs
			});

			showSuccess("Building updated successfully!", "Building Saved!");
			onClose();
		} catch (error) {
			console.error("Error saving building changes:", error);
			showError(
				error instanceof Error ? error.message : "The building could not be updated. Please try again.",
				"Failed to Save Building Changes"
			);
		}
	}

	async function createBuilding() {
		try {
			if (!requiredFieldsFilled()) {
				showWarning(
					"Please complete all required building details before creating the building.",
					"Incomplete Building Form"
				);
				return;
			}

			await api.post("/api/buildings", {
				category_type: buildingCategoryType,
				name: buildingName,
				code: buildingCode,
				address: buildingAddress,
				num_floors: numFloors,
				floor_svgs: floorSvgs
			});

			showSuccess("Building created successfully!", "Building Created!");
			onClose();
		} catch (error) {
			console.error("Error creating building:", error);
			showError(
				error instanceof Error ? error.message : "The building could not be created. Please try again.",
				"Failed to Create Building"
			);
		}
	}

	function requiredFieldsFilled(): boolean {
		console.log("Checking required fields:", {
			buildingCategoryType,
			buildingName,
			buildingCode,
			buildingAddress
		});
		return (
			buildingCategoryType !== null &&
			buildingName.trim() !== "" &&
			buildingCode.trim() !== "" &&
			buildingAddress.trim() !== ""
		);
	}

	return (
		<div className="modal-backdrop">
			<div className="building-modal">
				{/* Header */}
				<div className="modal-header">
					<h2 id="confirmation-modal-title">{bld_id ? "Edit Building" : "Create a New Building"}</h2>

					<button
						className={clsx("icon-button", {
							secondary: !changesMade && bld_id !== undefined,
							danger: changesMade || bld_id === undefined
						})}
						onClick={() => (changesMade || bld_id === undefined ? setDiscardPending(true) : onClose())}
						aria-label="Close dialog"
					>
						<img src={closeIcon} alt="close dialog" />
					</button>
				</div>

				{/* Body */}
				{(bld_id === undefined ||
					(buildingCategoryType !== null && buildingName && buildingCode && buildingAddress && numFloors !== null)) && (
					<div className="modal-body">
						{bld_id !== undefined && (
							<div className="item same-row">
								<label className="label">Location ID:</label>
								<span className="data">{bld_id}</span>
							</div>
						)}

						<div className="item">
							<label className="label">Name</label>
							<input
								value={buildingName!}
								onChange={(e) => setBuildingName(e.target.value)}
								style={{ width: "400px" }}
								required
							/>
						</div>

						<div className="item-row">
							<div className="item">
								<label className="label">Code</label>
								<input
									value={buildingCode!}
									onChange={(e) => setBuildingCode(e.target.value)}
									style={{ width: "80px" }}
									required
								/>
							</div>

							<div className="item">
								<label className="label">Category</label>
								<select
									value={buildingCategoryType ?? ""}
									onChange={(e) => setBuildingCategoryType(e.target.value)}
									style={{ width: "150px" }}
									required
								>
									<option value="" disabled>
										{buildingCategoryTypes?.length === 0 ? "Loading..." : "---"}
									</option>

									{buildingCategoryTypes?.map((type) => (
										<option key={type} value={type}>
											{type}
										</option>
									))}
								</select>
							</div>

							<div className="item">
								<label className="label"># of Floors</label>
								<input
									type="number"
									min="1"
									max="9"
									value={numFloors!}
									onChange={(e) => setNumFloors(Number(e.target.value))}
									style={{ width: "50px" }}
									required
								/>
							</div>
						</div>

						<div className="item">
							<label className="label">Address</label>
							<input
								value={buildingAddress!}
								onChange={(e) => setBuildingAddress(e.target.value)}
								style={{ width: "400px" }}
								required
							/>
						</div>

						<hr className="divider" />

						<div>
							<h3>Floor SVGs</h3>

							<div className="svg-uploads">
								{Array.from({ length: numFloors! }, (_, index) => index + 1).map((floorNumber) => (
									<div key={floorNumber} className="item same-row">
										<span className="label">{format(floorNumber, "0o")} Floor</span>
										<button className="button primary">
											Upload
											<img src={uploadIcon} alt="upload icon" />
										</button>
									</div>
								))}
							</div>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="modal-footer">
					<button
						className={clsx({
							"button secondary": !changesMade && bld_id !== undefined,
							"outline-button danger": changesMade || bld_id === undefined
						})}
						onClick={() => (changesMade || bld_id === undefined ? setDiscardPending(true) : onClose())}
					>
						Cancel
					</button>
					<button
						className="button primary"
						onClick={() => (bld_id !== undefined ? setSavePending(true) : setCreatePending(true))}
						disabled={(bld_id !== undefined && !changesMade) || !requiredFieldsFilled()}
					>
						{bld_id !== undefined ? "Save Changes" : "Create Building"}
					</button>
				</div>
			</div>

			{/* Create Confirmation Modal */}
			<ConfirmationModal
				isOpen={createPending}
				title="Create Building?"
				content="Are you sure you want to create a new building?"
				onClose={() => setCreatePending(false)}
				onConfirm={createBuilding}
			/>

			{/* Save Confirmation Modal */}
			<ConfirmationModal
				isOpen={savePending}
				title={"Save Changes?"}
				content="Are you sure you want to save your building changes?"
				onClose={() => setSavePending(false)}
				onConfirm={saveChanges}
			/>

			{/* Delete Confirmation Modal */}
			<ConfirmationModal
				isOpen={discardPending}
				title={"Discard Building Changes?"}
				content={
					bld_id === undefined
						? "Are you sure you want to discard your new building? All unsaved changes will be lost."
						: "Are you sure you want to discard your changes? All unsaved changes will be lost."
				}
				onClose={() => setDiscardPending(false)}
				onConfirm={onClose}
				isDanger={true}
			/>
		</div>
	);
}
