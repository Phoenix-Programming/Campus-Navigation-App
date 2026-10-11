import React, { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { format } from "numerable";
import { titleCase } from "title-case";
import type { BuildingData, IndoorMapData } from "../models/buildings_models";
import type { StagedIndoorMapGraphData } from "../models/indoor_map_editor_models";
import {
	buildFloorSvgCreatePayload,
	buildFloorSvgUpdatePayload,
	buildIndoorMapGraphDownloadPayload,
	getBuildingCategoryTypes as getBuildingCategoryTypesService,
	getBuildingData as getBuildingDataService,
	getFloorSvgForFloor,
	getIndoorMapData as getIndoorMapDataService,
	getLiveGraphFloors,
	normalizeFloorSvgData,
	normalizeUploadedGraphPayload,
	sanitizeBuildingCodeForFileName,
	updateIndoorMap as updateIndoorMapService,
	updateBuilding as updateBuildingService,
	createBuilding as createBuildingService
} from "../services/indoor_map_editor.service";
import ConfirmationModal from "@shared/components/ConfirmationModal";
import { showError, showSuccess, showWarning } from "@features/notifications/services/notifications.service";
import closeIcon from "@assets/icons/close.svg";
import downloadIcon from "@assets/icons/download.svg";
import uploadIcon from "@assets/icons/upload.svg";
import "@shared/styles/main.scss";
import "../styles/building-modal.scss";

interface BuildingModalProps {
	bld_id?: number;
	onClose: () => void;
	onBuildingSaved?: (buildingId?: number) => Promise<void> | void;
}

export default function BuildingModal({ bld_id, onClose, onBuildingSaved }: BuildingModalProps): React.JSX.Element {
	const [buildingCategoryTypes, setBuildingCategoryTypes] = useState<string[]>([]);
	const [buildingDataLoaded, setBuildingDataLoaded] = useState<boolean>(false);
	const [changesMade, setChangesMade] = useState<boolean>(false);
	const [buildingCategoryType, setBuildingCategoryType] = useState<string | null>(null);
	const [buildingName, setBuildingName] = useState<string>("");
	const [buildingCode, setBuildingCode] = useState<string>("");
	const [buildingAddress, setBuildingAddress] = useState<string>("");
	const [numFloors, setNumFloors] = useState<number>(1);
	const [floorSvgs, setFloorSvgs] = useState<{ [floorNumber: number]: string }>({});
	const [sessionUploadedFloors, setSessionUploadedFloors] = useState<Set<number>>(new Set());
	const [sessionUploadedFileNames, setSessionUploadedFileNames] = useState<Record<number, string>>({});
	const [liveGraphFloors, setLiveGraphFloors] = useState<Set<number>>(new Set());
	const [stagedGraphDataByFloor, setStagedGraphDataByFloor] = useState<Record<number, StagedIndoorMapGraphData>>({});
	const [sessionUploadedGraphFloors, setSessionUploadedGraphFloors] = useState<Set<number>>(new Set());
	const [sessionUploadedGraphFileNames, setSessionUploadedGraphFileNames] = useState<Record<number, string>>({});
	const [savePending, setSavePending] = useState<boolean>(false);
	const [createPending, setCreatePending] = useState<boolean>(false);
	const [discardPending, setDiscardPending] = useState<boolean>(false);
	const floorSvgUploadInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
	const floorGraphUploadInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
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
				JSON.stringify(floorSvgs) !== JSON.stringify(initialFormRef.current.floorSvgs) ||
				Object.keys(stagedGraphDataByFloor).length > 0
		);
	}, [
		buildingDataLoaded,
		buildingCategoryType,
		buildingName,
		buildingCode,
		buildingAddress,
		numFloors,
		floorSvgs,
		stagedGraphDataByFloor
	]);

	async function getBuildingCategoryTypes() {
		let categories: string[] = await getBuildingCategoryTypesService();
		categories = categories.map((category) => titleCase(category));
		setBuildingCategoryTypes(categories);
	}

	async function getBuildingData() {
		const response: BuildingData = await getBuildingDataService(bld_id!);
		const normalizedFloorSvgs: { [floorNumber: number]: string } = normalizeFloorSvgData(
			response.floor_svgs,
			response.num_floors
		);
		const nextLiveGraphFloors: Set<number> = await getLiveGraphFloors(response.code, response.num_floors);

		setBuildingCategoryType(titleCase(response.category_type));
		setBuildingName(response.name);
		setBuildingCode(response.code);
		setBuildingAddress(response.address);
		setNumFloors(response.num_floors);
		setFloorSvgs(normalizedFloorSvgs);
		setSessionUploadedFloors(new Set());
		setSessionUploadedFileNames({});
		setLiveGraphFloors(nextLiveGraphFloors);
		setStagedGraphDataByFloor({});
		setSessionUploadedGraphFloors(new Set());
		setSessionUploadedGraphFileNames({});

		initialFormRef.current = {
			buildingCategoryType: titleCase(response.category_type),
			buildingName: response.name,
			buildingCode: response.code,
			buildingAddress: response.address,
			numFloors: response.num_floors,
			floorSvgs: normalizedFloorSvgs
		};

		setChangesMade(false);
		setBuildingDataLoaded(true);
	}

	function openFloorSvgFilePicker(floorNumber: number): void {
		floorSvgUploadInputRefs.current[floorNumber]?.click();
	}

	function openFloorGraphFilePicker(floorNumber: number): void {
		floorGraphUploadInputRefs.current[floorNumber]?.click();
	}

	function getGraphTargetBuildingCode(): string {
		if (isCreateMode) return buildingCode.trim();

		return initialFormRef.current?.buildingCode.trim() ?? buildingCode.trim();
	}

	async function persistStagedGraphData(targetBuildingCode: string): Promise<void> {
		const floorNumbers: number[] = Object.keys(stagedGraphDataByFloor)
			.map((floorNumber) => Number(floorNumber))
			.filter((floorNumber) => Number.isInteger(floorNumber) && floorNumber >= 1 && floorNumber <= numFloors)
			.sort((floorA, floorB) => floorA - floorB);

		for (const floorNumber of floorNumbers) {
			const stagedGraphData: StagedIndoorMapGraphData | undefined = stagedGraphDataByFloor[floorNumber];

			if (!stagedGraphData) continue;

			await updateIndoorMapService(targetBuildingCode, floorNumber, stagedGraphData.nodes, stagedGraphData.edges);
		}
	}

	function downloadFloorSvg(floorNumber: number): void {
		const svgContent: string = getFloorSvgForFloor(floorSvgs, floorNumber).trim();

		if (svgContent === "") {
			showWarning("No SVG is available to download for this floor.", "Nothing to Download");
			return;
		}

		const fileName: string = `campus-map-${sanitizeBuildingCodeForFileName(buildingCode)}-${format(floorNumber, "0o")}-floor.svg`;
		const blob: Blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
		const objectUrl: string = window.URL.createObjectURL(blob);
		const downloadLink: HTMLAnchorElement = document.createElement("a");

		downloadLink.href = objectUrl;
		downloadLink.download = fileName;
		document.body.appendChild(downloadLink);
		downloadLink.click();
		downloadLink.remove();
		window.URL.revokeObjectURL(objectUrl);
	}

	async function downloadFloorGraphData(floorNumber: number): Promise<void> {
		const targetBuildingCode: string = getGraphTargetBuildingCode();

		if (targetBuildingCode === "") {
			showWarning("Save the building before downloading graph data.", "Building Code Required");
			return;
		}

		try {
			const data: IndoorMapData = await getIndoorMapDataService(targetBuildingCode, floorNumber);

			const fileName: string = `campus-map-graph-${sanitizeBuildingCodeForFileName(targetBuildingCode)}-${format(floorNumber, "0o")}-floor.json`;
			const payload = buildIndoorMapGraphDownloadPayload(targetBuildingCode, floorNumber, data);
			const blob: Blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
			const objectUrl: string = window.URL.createObjectURL(blob);
			const downloadLink: HTMLAnchorElement = document.createElement("a");

			downloadLink.href = objectUrl;
			downloadLink.download = fileName;
			document.body.appendChild(downloadLink);
			downloadLink.click();
			downloadLink.remove();
			window.URL.revokeObjectURL(objectUrl);
		} catch (error) {
			console.error("Error downloading indoor graph data:", error);
			showError(
				error instanceof Error ? error.message : "The graph data could not be downloaded for this floor.",
				"Failed to Download Graph Data"
			);
		}
	}

	async function handleFloorSvgUpload(floorNumber: number, event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
		const file: File | undefined = event.target.files?.[0];

		if (!file) return;

		const isSvgFile: boolean = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

		if (!isSvgFile) {
			showWarning("Please upload an SVG file.", "Invalid File Type");
			event.target.value = "";
			return;
		}

		try {
			const svgContent: string = await file.text();

			if (!/<svg[\s>]/i.test(svgContent)) {
				showWarning("The selected file does not contain valid SVG markup.", "Invalid SVG");
				event.target.value = "";
				return;
			}

			setFloorSvgs((prev) => ({
				...prev,
				[floorNumber]: svgContent
			}));
			setSessionUploadedFloors((prev) => {
				const next = new Set(prev);
				next.add(floorNumber);
				return next;
			});
			setSessionUploadedFileNames((prev) => ({
				...prev,
				[floorNumber]: file.name
			}));
		} catch (error) {
			console.error("Error reading SVG file:", error);
			showError("The selected SVG could not be read. Please try another file.", "Failed to Read SVG");
		} finally {
			event.target.value = "";
		}
	}

	async function handleFloorGraphUpload(
		floorNumber: number,
		event: React.ChangeEvent<HTMLInputElement>
	): Promise<void> {
		const file: File | undefined = event.target.files?.[0];

		if (!file) return;

		const isJsonFile: boolean = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");

		if (!isJsonFile) {
			showWarning("Please upload a JSON file.", "Invalid File Type");
			event.target.value = "";
			return;
		}

		try {
			const fileText: string = await file.text();
			const parsedPayload: unknown = JSON.parse(fileText);
			const normalizedGraphData: StagedIndoorMapGraphData = normalizeUploadedGraphPayload(
				parsedPayload,
				floorNumber,
				getGraphTargetBuildingCode()
			);

			setStagedGraphDataByFloor((prev) => ({
				...prev,
				[floorNumber]: normalizedGraphData
			}));
			setSessionUploadedGraphFloors((prev) => {
				const next = new Set(prev);
				next.add(floorNumber);
				return next;
			});
			setSessionUploadedGraphFileNames((prev) => ({
				...prev,
				[floorNumber]: file.name
			}));

			showSuccess(
				`Indoor graph data for floor ${format(floorNumber, "0o")} was uploaded successfully. Save the building to make it live.`,
				"Graph Uploaded"
			);
		} catch (error) {
			console.error("Error uploading indoor graph data:", error);
			showError(
				error instanceof Error ? error.message : "The selected graph file could not be uploaded.",
				"Failed to Upload Graph Data"
			);
		} finally {
			event.target.value = "";
		}
	}

	async function saveChanges() {
		try {
			if (!requiredFieldsFilled()) {
				showWarning("Please complete all required building details before saving.", "Incomplete Building Form");
				return;
			}

			if (!initialFormRef.current) return;

			const svgs: (string | null)[] | null = buildFloorSvgUpdatePayload(
				initialFormRef.current.floorSvgs,
				floorSvgs,
				initialFormRef.current.numFloors,
				numFloors
			);

			await updateBuildingService(
				bld_id!,
				buildingCategoryType!,
				buildingName,
				buildingCode,
				buildingAddress,
				numFloors,
				svgs
			);

			await persistStagedGraphData(buildingCode.trim());

			await onBuildingSaved?.(bld_id);
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

			const svgs: (string | null)[] | null = buildFloorSvgCreatePayload(floorSvgs, numFloors);

			await createBuildingService(buildingCategoryType!, buildingName, buildingCode, buildingAddress, numFloors, svgs);

			await persistStagedGraphData(buildingCode.trim());

			await onBuildingSaved?.();
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

	const isCreateMode = bld_id === undefined;

	const hasUploadedSvgForFloor = (floorNumber: number): boolean =>
		getFloorSvgForFloor(floorSvgs, floorNumber).trim().length > 0;

	const hasBackendSvgForFloor = (floorNumber: number): boolean => {
		if (isCreateMode || !initialFormRef.current) return false;

		return getFloorSvgForFloor(initialFormRef.current.floorSvgs, floorNumber).trim().length > 0;
	};

	function getFloorUploadStatus(floorNumber: number): string {
		if (!hasUploadedSvgForFloor(floorNumber)) return "No file";
		if (sessionUploadedFloors.has(floorNumber)) return `Uploaded ${sessionUploadedFileNames[floorNumber]}`;
		if (hasBackendSvgForFloor(floorNumber)) return "Live SVG";

		return "SVG uploaded";
	}

	function hasGraphJsonForFloor(floorNumber: number): boolean {
		return sessionUploadedGraphFloors.has(floorNumber) || liveGraphFloors.has(floorNumber);
	}

	function getFloorGraphStatus(floorNumber: number): string {
		if (sessionUploadedGraphFloors.has(floorNumber)) {
			return `Uploaded ${sessionUploadedGraphFileNames[floorNumber]}`;
		}

		if (liveGraphFloors.has(floorNumber)) return "Live graph JSON";

		return "No graph JSON";
	}

	const hasCreateFormData =
		buildingCategoryType !== null ||
		buildingName.trim() !== "" ||
		buildingCode.trim() !== "" ||
		buildingAddress.trim() !== "" ||
		numFloors !== 1 ||
		Object.keys(floorSvgs).length > 0 ||
		Object.keys(stagedGraphDataByFloor).length > 0;
	const shouldConfirmDiscard = isCreateMode ? hasCreateFormData : changesMade;
	const isConfirmationModalOpen = createPending || savePending || discardPending;

	useEffect(() => {
		if (isConfirmationModalOpen) return;

		const onKeyDown = (event: KeyboardEvent): void => {
			if (event.key !== "Escape" || event.defaultPrevented) return;

			event.preventDefault();
			if (shouldConfirmDiscard) setDiscardPending(true);
			else onClose();
		};

		window.addEventListener("keydown", onKeyDown);

		return () => {
			window.removeEventListener("keydown", onKeyDown);
		};
	}, [isConfirmationModalOpen, shouldConfirmDiscard, onClose]);

	return (
		<div className="modal-backdrop">
			<div className="building-modal">
				{/* Header */}
				<div className="modal-header">
					<h2 id="confirmation-modal-title">{bld_id ? "Edit Building" : "Create a New Building"}</h2>

					<button
						className={clsx("icon-button", {
							secondary: !shouldConfirmDiscard,
							danger: shouldConfirmDiscard
						})}
						onClick={() => (shouldConfirmDiscard ? setDiscardPending(true) : onClose())}
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

							<p className="section-note">Upload or download the SVG for each floor.</p>

							<table className="svg-uploads" aria-label="Floor SVG uploads">
								<tbody>
									{Array.from({ length: numFloors! }, (_, index) => index + 1).map((floorNumber) => (
										<tr key={floorNumber}>
											<td className="label">{format(floorNumber, "0o")} Floor</td>

											<td>
												<div className="svg-action-buttons">
													<input
														type="file"
														accept=".svg,image/svg+xml"
														ref={(element) => {
															floorSvgUploadInputRefs.current[floorNumber] = element;
														}}
														onChange={(event) => {
															void handleFloorSvgUpload(floorNumber, event);
														}}
														style={{ display: "none" }}
													/>

													<button
														className={clsx("primary upload-button", {
															button: !hasUploadedSvgForFloor(floorNumber),
															"outline-button": hasUploadedSvgForFloor(floorNumber)
														})}
														type="button"
														onClick={() => openFloorSvgFilePicker(floorNumber)}
													>
														{hasUploadedSvgForFloor(floorNumber) ? "Replace" : "Upload"}
														<img src={uploadIcon} alt="upload icon" />
													</button>

													{bld_id !== undefined && (
														<button
															className="button secondary download-button"
															type="button"
															onClick={() => downloadFloorSvg(floorNumber)}
															disabled={!hasUploadedSvgForFloor(floorNumber)}
														>
															Download
															<img src={downloadIcon} alt="download icon" />
														</button>
													)}
												</div>
											</td>

											<td className="data">{getFloorUploadStatus(floorNumber)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<hr className="divider" />

						<div>
							<h3>Floor Graphs</h3>

							<p className="section-note">
								Upload graph JSON for any floor. Downloads stay disabled until live graph data exists.
							</p>

							<table className="graph-uploads" aria-label="Floor graph uploads and downloads">
								<tbody>
									{Array.from({ length: numFloors! }, (_, index) => index + 1).map((floorNumber) => (
										<tr key={`graph-${floorNumber}`}>
											<td className="label">{format(floorNumber, "0o")} Floor</td>

											<td>
												<div className="graph-action-buttons">
													<input
														type="file"
														accept=".json,application/json"
														ref={(element) => {
															floorGraphUploadInputRefs.current[floorNumber] = element;
														}}
														onChange={(event) => {
															void handleFloorGraphUpload(floorNumber, event);
														}}
														style={{ display: "none" }}
													/>

													<button
														className={clsx("primary graph-upload-button", {
															button: !hasGraphJsonForFloor(floorNumber),
															"outline-button": hasGraphJsonForFloor(floorNumber)
														})}
														type="button"
														onClick={() => openFloorGraphFilePicker(floorNumber)}
													>
														{hasGraphJsonForFloor(floorNumber) ? "Replace JSON" : "Upload JSON"}
														<img src={uploadIcon} alt="upload graph icon" />
													</button>

													<button
														className="button secondary graph-download-button"
														type="button"
														onClick={() => {
															void downloadFloorGraphData(floorNumber);
														}}
														disabled={isCreateMode || !liveGraphFloors.has(floorNumber)}
													>
														Download JSON
														<img src={downloadIcon} alt="download graph icon" />
													</button>
												</div>
											</td>

											<td className="data">{getFloorGraphStatus(floorNumber)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}

				{/* Footer */}
				<div className="modal-footer">
					<button
						className={clsx({
							"button secondary": !shouldConfirmDiscard,
							"outline-button danger": shouldConfirmDiscard
						})}
						onClick={() => (shouldConfirmDiscard ? setDiscardPending(true) : onClose())}
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
