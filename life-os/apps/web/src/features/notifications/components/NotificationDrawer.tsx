import { Drawer } from "@components/feedback";
import { NotificationCenter } from "./NotificationCenter";

export interface NotificationDrawerProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onNavigateTarget?: (targetUrl: string) => void;
  readonly onOpenSettings?: () => void;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly className?: string;
}

export function NotificationDrawer({
  open,
  onClose,
  onNavigateTarget,
  onOpenSettings,
  timeZone = "UTC",
  locale = "en-US",
  className,
}: NotificationDrawerProps) {
  const handleNavigateTarget = (targetUrl: string) => {
    onClose();
    onNavigateTarget?.(targetUrl);
  };

  const handleOpenSettings = () => {
    onClose();
    onOpenSettings?.();
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Notifications"
      placement="end"
      {...(className ? { className } : {})}
    >
      <div data-testid="notification-drawer" style={{ padding: "var(--lifeos-space-2)" }}>
        <NotificationCenter
          onNavigateTarget={handleNavigateTarget}
          {...(onOpenSettings ? { onOpenSettings: handleOpenSettings } : {})}
          timeZone={timeZone}
          locale={locale}
        />
      </div>
    </Drawer>
  );
}
