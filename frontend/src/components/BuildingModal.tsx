import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { format } from "numerable";
import ConfirmationModal from "./ConfirmationModal";
import api from "../api";
import closeIcon from "../assets/icons/close.svg";
import uploadIcon from "../assets/icons/upload.svg";
import "@styles/main.scss";
import "@styles/components/building-modal.scss";

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
		// Fetch building category types from the backend
		// await api.get("/api/building-category-types")
		// 	.then((response) => response.json())
		// 	.then((data) => {
		// 		setBuildingCategoryTypes(data);
		// 	})
		// 	.catch((error) => {
		// 		console.error("Error fetching building category types:", error);
		// 	});

		// Temporary hardcoded building category types until the backend endpoint is implemented
		setBuildingCategoryTypes(["Academic", "Residential", "Administrative", "Recreational"]);
	}, []);

	useEffect(() => {
		if (bld_id === undefined) return;

		// Fetch building data from the backend using the bld_id
		// await api.get(`/api/buildings/${bld_id}`)
		// 	.then((response) => response.json())
		// 	.then((data) => {
		// 		setBuildingCategoryType(data.category_type);
		// 		setBuildingName(data.name);
		// 		setBuildingCode(data.code);
		// 		setBuildingAddress(data.address);
		// 		setNumFloors(data.num_floors);
		// 		setBuildingDataLoaded(true);
		// 	})
		// 	.catch((error) => {
		// 		console.error("Error fetching building data:", error);
		// 	});

		// Temporary hardcoded building data until the backend endpoint is implemented
		const initialData = {
			buildingCategoryType: "Academic",
			buildingName: "Innovation, Science and Technology Building",
			buildingCode: "IST",
			buildingAddress: "4450 Polytechnic Cir, Lakeland, FL 33805",
			numFloors: 2,
			floorSvgs: {}
		};

		setBuildingCategoryType(initialData.buildingCategoryType);
		setBuildingName(initialData.buildingName);
		setBuildingCode(initialData.buildingCode);
		setBuildingAddress(initialData.buildingAddress);
		setNumFloors(initialData.numFloors);
		setFloorSvgs(initialData.floorSvgs);
		initialFormRef.current = initialData;
		setChangesMade(false);
		setBuildingDataLoaded(true);
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

	async function saveChanges() {
		try {
			await api.put(`/api/buildings/${bld_id}`, {
				category_type: buildingCategoryType,
				name: buildingName,
				code: buildingCode,
				address: buildingAddress,
				num_floors: numFloors,
				floor_svgs: floorSvgs
			});
		} catch (error) {
			console.error("Error saving building changes:", error);
		}

		onClose();
	}

	async function createBuilding() {
		try {
			// await api.post("/api/buildings", {
			// 	category_type: buildingCategoryType,
			// 	name: buildingName,
			// 	code: buildingCode,
			// 	address: buildingAddress,
			// 	num_floors: numFloors,
			// 	floor_svgs: floorSvgs
			// });
		} catch (error) {
			console.error("Error creating building:", error);
		}

		onClose();
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
										{buildingCategoryTypes.length === 0 ? "Loading..." : "---"}
									</option>

									{buildingCategoryTypes.map((type) => (
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
