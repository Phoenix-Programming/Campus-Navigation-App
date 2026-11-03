import React from "react";
import ConfirmationModal from "@shared/components/ConfirmationModal";
import "../styles/confirm-save-discard-modals.scss";

interface ConfirmSaveDiscardModalsProps {
	savePending: boolean;
	discardPending: boolean;
	onSaveClose: () => void;
	onSaveConfirm: () => void;
	onDiscardClose: () => void;
	onDiscardConfirm: () => void;
}

export default function ConfirmSaveDiscardModals({
	savePending,
	discardPending,
	onSaveClose,
	onSaveConfirm,
	onDiscardClose,
	onDiscardConfirm
}: ConfirmSaveDiscardModalsProps): React.JSX.Element {
	return (
		<div className="confirm-save-discard-modals">
			<ConfirmationModal
				isOpen={savePending}
				title="Confirm Save Changes"
				content="Are you sure you want to save the changes? This action will be made live immediately to all users."
				onClose={onSaveClose}
				onConfirm={onSaveConfirm}
			/>

			<ConfirmationModal
				isOpen={discardPending}
				title="Confirm Discard Changes"
				content="Are you sure you want to discard the changes? This action cannot be undone."
				onClose={onDiscardClose}
				onConfirm={onDiscardConfirm}
				isDanger={true}
			/>
		</div>
	);
}
