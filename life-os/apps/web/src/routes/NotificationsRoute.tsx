import { useNavigate } from "react-router-dom";
import { NotificationsScreen } from "@features/notifications";

export function NotificationsRoute() {
  const navigate = useNavigate();

  return (
    <NotificationsScreen
      onNavigateTarget={(targetUrl) => navigate(targetUrl)}
      onOpenSettings={() => navigate("/life-os/app/settings/notifications")}
    />
  );
}
