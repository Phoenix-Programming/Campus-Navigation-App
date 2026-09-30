import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import closeIcon from "../assets/icons/close.svg";
import uploadIcon from "../assets/icons/upload.svg";
import "@styles/main.scss";
import "@styles/components/edit-building-modal.scss";

interface EditBuildingModalProps {
	bld_id: number;
	onClose: () => void;
}

export default function EditBuildingModal({ bld_id, onClose }: EditBuildingModalProps): React.JSX.Element {
	const [buildingCategoryTypes, setBuildingCategoryTypes] = useState<string[]>([]);
	const [buildingDataLoaded, setBuildingDataLoaded] = useState<boolean>(false);
	const [changesMade, setChangesMade] = useState<boolean>(false);
	const [buildingCategoryType, setBuildingCategoryType] = useState<string | null>(null);
	const [buildingName, setBuildingName] = useState<string>("");
	const [buildingCode, setBuildingCode] = useState<string>("");
	const [buildingAddress, setBuildingAddress] = useState<string>("");
	const [numFloors, setNumFloors] = useState<number | null>(null);
	const [floorSvgs, setFloorSvgs] = useState<{ [floorNumber: number]: string }>({});
	const [showConfirmationModal, setShowConfirmationModal] = useState<boolean>(false);
	const [savePending, setSavePending] = useState<boolean>(false);
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
		// Fetch building category types from the backend
		// fetch("/api/building-category-types")
		// 	.then((response) => response.json())
		// 	.then((data) => {
		// 		setBuildingCategoryTypes(data);
		// 	})
		// 	.catch((error) => {
		// 		console.error("Error fetching building category types:", error);
		// 	});

		// Temporary hardcoded building category types until the backend endpoint is implemented
		setBuildingCategoryTypes(["Academic", "Residential", "Administrative", "Recreational", "Other"]);
	}, []);

	useEffect(() => {
		// Fetch building data from the backend using the bld_id
		// fetch(`/api/buildings/${bld_id}`)
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

	function saveChanges() {
		console.log("Saving changes for building ID:", bld_id);
		console.log("Building Name:", buildingName);
		console.log("Building Code:", buildingCode);
		console.log("Building Address:", buildingAddress);
		console.log("Number of Floors:", numFloors);
		console.log("Building Category Type:", buildingCategoryType);

		onClose();
	}

	return (
		<div className="modal-backdrop">
			<div className="edit-building-modal">
				{/* Header */}
				<div className="modal-header">
					<h2 id="confirmation-modal-title">Edit Building</h2>

					<button
						className={clsx(
							"icon-button",
							{
								"secondary": !changesMade,
								"danger": changesMade
							}
						)}
						onClick={onClose} aria-label="Close dialog"
					>
						<img src={closeIcon} alt="close dialog" />
					</button>
				</div>

				{/* Body */}
				{buildingCategoryType !== null && buildingName && buildingCode && buildingAddress && numFloors !== null && (
					<div className="modal-body">
						<div className="item same-row">
							<span className="label">Location ID:</span>
							<span className="data">{bld_id}</span>
						</div>

						<div className="item">
							<span className="label">Building Name</span>
							<input
								value={buildingName}
								onChange={(e) => setBuildingName(e.target.value)}
								style={{ width: "400px" }}
							/>
						</div>

						<div className="item-row">
							<div className="item">
								<span className="label">Building Code</span>
								<input
									value={buildingCode}
									onChange={(e) => setBuildingCode(e.target.value)}
									style={{ width: "80px" }}
								/>
							</div>

							<div className="item">
								<span className="label">Building Category Type</span>
								<select
									value={buildingCategoryType!}
									onChange={(e) => setBuildingCategoryType(e.target.value)}
									style={{ width: "150px" }}
								>
									{buildingCategoryTypes.map((type) => (
										<option key={type} value={type}>
											{type}
										</option>
									))}
								</select>
							</div>

							<div className="item">
								<span className="label">Number of Floors</span>
								<input
									type="number"
									value={numFloors!}
									onChange={(e) => setNumFloors(Number(e.target.value))}
									style={{ width: "50px" }}
								/>
							</div>
						</div>

						<div className="item">
							<span className="label">Building Address</span>
							<input
								value={buildingAddress}
								onChange={(e) => setBuildingAddress(e.target.value)}
								style={{ width: "400px" }}
							/>
						</div>

						<hr className="divider" />

						<div>
							<h3>Floor SVG{numFloors > 1 ? "s" : ""}</h3>

							<div className="svg-uploads">
								{Array.from({ length: numFloors! }, (_, index) => index + 1).map((floorNumber) => (
									<div key={floorNumber} className="item same-row">
										<span className="label">Floor {floorNumber} SVG</span>
										<button className="button primary">
											Upload SVG
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
						className={clsx("button", {
							secondary: !changesMade,
							danger: changesMade
						})}
						onClick={onClose}
					>
						Cancel
					</button>
					<button className="button primary" onClick={saveChanges}>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
}
