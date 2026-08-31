import { useNavigate } from "react-router-dom";
import { PageHeader } from "@components/navigation";
import { useAuthSession } from "@state/authSession";
import { NotificationCenter } from "./NotificationCenter";
import "./notifications-screen.css";

export interface NotificationsScreenProps {
  readonly onNavigateTarget?: (targetUrl: string) => void;
  readonly onOpenSettings?: () => void;
  readonly className?: string;
}

export function NotificationsScreen({
  onNavigateTarget,
  onOpenSettings,
  className,
}: NotificationsScreenProps) {
  const navigate = useNavigate();
  const { user } = useAuthSession();

  const handleNavigateTarget = (targetUrl: string) => {
    if (onNavigateTarget) {
      onNavigateTarget(targetUrl);
    } else {
      navigate(targetUrl);
    }
  };

  const handleOpenSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
    } else {
      navigate("/life-os/app/settings/notifications");
    }
  };

  const rootClasses = ["lifeos-notifications-screen", className].filter(Boolean).join(" ");

  return (
    <div className={rootClasses} data-testid="notifications-screen">
      <PageHeader
        title="Notifications"
        description="View and manage your in-app notifications."
        breadcrumbs={[
          { label: "Today", href: "/life-os/app/today" },
          { label: "Notifications", href: "/life-os/app/notifications" },
        ]}
      />

      <main className="lifeos-notifications-content">
        <NotificationCenter
          onNavigateTarget={handleNavigateTarget}
          onOpenSettings={handleOpenSettings}
          timeZone={user?.timeZone ?? "UTC"}
          locale={user?.locale ?? "en-US"}
        />
      </main>
    </div>
  );
}
