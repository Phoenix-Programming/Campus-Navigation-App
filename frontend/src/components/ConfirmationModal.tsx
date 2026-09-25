import React, { type ReactNode } from "react";
import { clsx } from "clsx";
import closeIcon from "../assets/icons/close.svg";
import "@styles/components/confirmation-modal.scss";

interface ConfirmationModalProps {
	isOpen: boolean;
	title: string;
	content: ReactNode;
	onClose?: () => void;
	onConfirm?: () => void;
	confirmText?: string;
	cancelText?: string;
	isDanger?: boolean;
}

export default function ConfirmationModal({
	isOpen,
	title,
	content,
	onClose,
	onConfirm,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDanger = false
}: ConfirmationModalProps): React.JSX.Element | null {
	if (!isOpen) return null;

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div
				className="confirmation-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="confirmation-modal-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="modal-header">
					<h2 id="confirmation-modal-title">{title}</h2>
					<button type="button" className="close-button" onClick={onClose} aria-label="Close dialog">
						<img src={closeIcon} alt="close dialog" />
					</button>
				</div>

				<div className="modal-content">{content}</div>

				<div className="modal-actions">
					<button type="button" className="secondary-button" onClick={onClose}>
						{cancelText}
					</button>
					<button type="button" className={clsx("primary-button", isDanger && "danger-button")} onClick={onConfirm}>
						{confirmText}
					</button>
				</div>
			</div>
		</div>
	);
}
