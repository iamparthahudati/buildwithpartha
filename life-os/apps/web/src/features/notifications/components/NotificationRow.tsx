import { ExternalLink, Check, Trash2 } from "lucide-react";
import { Badge, IconButton, Icon, Text } from "@components/ui";
import { formatLocalDate, todayLocalDate } from "@lib/localDateTime";
import {
  getCategoryBadgeTone,
  getCategoryLabel,
  getCategoryIcon,
  type NotificationItem,
} from "../model/notifications";
import "./notification-row.css";

export interface NotificationRowProps {
  readonly notification: NotificationItem;
  readonly onMarkRead?: (id: string) => void;
  readonly onMarkUnread?: (id: string) => void;
  readonly onClear?: (id: string) => void;
  readonly onOpenTarget?: (targetUrl: string) => void;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly className?: string;
}

export function NotificationRow({
  notification,
  onMarkRead,
  onMarkUnread,
  onClear,
  onOpenTarget,
  timeZone = "UTC",
  locale = "en-US",
  className,
}: NotificationRowProps) {
  const isUnread = notification.readAt === null;
  const CategoryIcon = getCategoryIcon(notification.category);
  const badgeTone = getCategoryBadgeTone(notification.category);
  const categoryLabel = getCategoryLabel(notification.category);

  const createdDate = new Date(notification.createdAt);
  const formattedTime = formatLocalDate(todayLocalDate(timeZone, createdDate), locale);

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) {
      onMarkRead?.(notification.id);
    } else {
      onMarkUnread?.(notification.id);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (notification.isClearable) {
      onClear?.(notification.id);
    }
  };

  const handleOpenTarget = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUnread) {
      onMarkRead?.(notification.id);
    }
    if (notification.targetUrl) {
      onOpenTarget?.(notification.targetUrl);
    }
  };

  const rootClasses = ["lifeos-notification-row", isUnread && "is-unread", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClasses}
      data-testid={`notification-row-${notification.id}`}
      data-unread={isUnread}
    >
      {isUnread ? (
        <span className="lifeos-notification-row__unread-indicator" aria-hidden="true" />
      ) : null}

      <div className="lifeos-notification-row__icon-wrapper">
        <Icon icon={CategoryIcon} size="sm" label={categoryLabel} />
      </div>

      <div className="lifeos-notification-row__content">
        <div className="lifeos-notification-row__header">
          <Badge tone={badgeTone}>{categoryLabel}</Badge>
          <Text weight="medium" size="sm" className="lifeos-notification-row__title">
            {isUnread ? (
              <span className="lifeos-visually-hidden">Unread notification: </span>
            ) : null}
            {notification.title}
          </Text>
        </div>

        <Text tone="secondary" size="sm" className="lifeos-notification-row__body">
          {notification.body}
        </Text>

        <div className="lifeos-notification-row__footer">
          <Text tone="secondary" size="xs">
            {formattedTime}
          </Text>
          {notification.targetUrl ? (
            <IconButton
              icon={ExternalLink}
              label="Open linked item"
              variant="ghost"
              size="sm"
              className="lifeos-notification-row__target-btn"
              onClick={handleOpenTarget}
            />
          ) : null}
        </div>
      </div>

      <div className="lifeos-notification-row__actions">
        <IconButton
          icon={Check}
          label={isUnread ? "Mark as read" : "Mark as unread"}
          variant="ghost"
          size="sm"
          onClick={handleToggleRead}
        />

        <IconButton
          icon={Trash2}
          label="Clear notification"
          variant="ghost"
          size="sm"
          disabled={!notification.isClearable}
          onClick={handleClear}
        />
      </div>
    </div>
  );
}
