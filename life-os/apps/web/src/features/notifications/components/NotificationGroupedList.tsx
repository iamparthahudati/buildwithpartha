import { Text, CountBadge } from "@components/ui";
import { groupNotificationsByDate, type NotificationItem } from "../model/notifications";
import { NotificationRow } from "./NotificationRow";

export interface NotificationGroupedListProps {
  readonly items: readonly NotificationItem[];
  readonly onMarkRead?: (id: string) => void;
  readonly onMarkUnread?: (id: string) => void;
  readonly onClear?: (id: string) => void;
  readonly onOpenTarget?: (targetUrl: string) => void;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly className?: string;
}

export function NotificationGroupedList({
  items,
  onMarkRead,
  onMarkUnread,
  onClear,
  onOpenTarget,
  timeZone = "UTC",
  locale = "en-US",
  className,
}: NotificationGroupedListProps) {
  const groups = groupNotificationsByDate(items);

  const rootClasses = ["lifeos-notification-grouped-list", className].filter(Boolean).join(" ");

  return (
    <div className={rootClasses} data-testid="notification-grouped-list">
      {groups.map((group) => (
        <section key={group.title} className="lifeos-notification-group" aria-label={group.title}>
          <div
            className="lifeos-notification-group__header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--lifeos-space-2)",
              marginBottom: "var(--lifeos-space-2)",
            }}
          >
            <Text weight="medium" size="sm" tone="secondary">
              {group.title}
            </Text>
            <CountBadge count={group.items.length} label={`${group.title} notification count`} />
          </div>
          <div
            className="lifeos-notification-group__items"
            style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-2)" }}
          >
            {group.items.map((item) => (
              <NotificationRow
                key={item.id}
                notification={item}
                {...(onMarkRead ? { onMarkRead } : {})}
                {...(onMarkUnread ? { onMarkUnread } : {})}
                {...(onClear ? { onClear } : {})}
                {...(onOpenTarget ? { onOpenTarget } : {})}
                timeZone={timeZone}
                locale={locale}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
