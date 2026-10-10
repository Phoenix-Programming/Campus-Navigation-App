import { type JSX, useState } from "react";
import clsx from "clsx";
import { useNotifications } from "../services/notifications";
import close from "@assets/icons/close.svg";
import "@styles/components/notification-center.scss";
import "@styles/main.scss";

export default function NotificationCenter(): JSX.Element {
	const { notifications, dismiss } = useNotifications();
	const [closingIds, setClosingIds] = useState<string[]>([]);

	const handleDismiss = (id: string): void => {
		if (closingIds.includes(id)) return;

		setClosingIds((current) => [...current, id]);
		window.setTimeout(() => {
			dismiss(id);
			setClosingIds((current) => current.filter((notificationId) => notificationId !== id));
		}, 200);
	};

	return (
		<div className="notification-container" aria-live="polite" aria-atomic="false">
			{notifications.map((notification) => (
				<div
					key={notification.id}
					className={clsx("notification", `${notification.type}`, {
						"is-removing": closingIds.includes(notification.id)
					})}
					role="status"
				>
					<div className="content">
						{notification.title &&
							<p className="title">{notification.title}</p>
						}

						<p className="message">{notification.message}</p>
					</div>

					<button
						className="close icon-button"
						aria-label={`Dismiss ${notification.title ?? notification.type} notification`}
						onClick={() => handleDismiss(notification.id)}
					>
						<img src={close} alt="Close" />
					</button>
				</div>
			))}
		</div>
	);
}
