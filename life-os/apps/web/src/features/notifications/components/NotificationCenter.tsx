import { useState } from "react";
import { CheckCheck, Trash2, Settings, Bell } from "lucide-react";
import { Button, CountBadge, Checkbox, Select, Skeleton, Text, Icon } from "@components/ui";
import { Pagination } from "@components/navigation";
import { EmptyState, ErrorState } from "@components/feedback";
import { NOTIFICATION_CATEGORIES, getCategoryLabel } from "../model/notifications";
import {
  useNotifications,
  useNotificationUnreadCount,
  useMarkNotificationRead,
  useMarkNotificationUnread,
  useMarkAllNotificationsRead,
  useClearNotification,
  useClearAllNotifications,
} from "../hooks/useNotifications";
import { NotificationGroupedList } from "./NotificationGroupedList";
import "./notification-center.css";

export interface NotificationCenterProps {
  readonly onNavigateTarget?: (targetUrl: string) => void;
  readonly onOpenSettings?: () => void;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly className?: string;
}

export function NotificationCenter({
  onNavigateTarget,
  onOpenSettings,
  timeZone = "UTC",
  locale = "en-US",
  className,
}: NotificationCenterProps) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const notificationsQuery = useNotifications({
    unreadOnly,
    ...(selectedCategory ? { category: selectedCategory } : {}),
    page,
    size: pageSize,
  });

  const unreadCountQuery = useNotificationUnreadCount();

  const markReadMutation = useMarkNotificationRead();
  const markUnreadMutation = useMarkNotificationUnread();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const clearMutation = useClearNotification();
  const clearAllMutation = useClearAllNotifications();

  const unreadCount = unreadCountQuery.data?.count ?? 0;
  const pageData = notificationsQuery.data;

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const handleMarkUnread = (id: string) => {
    markUnreadMutation.mutate(id);
  };

  const handleClear = (id: string) => {
    clearMutation.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleClearAll = () => {
    clearAllMutation.mutate();
  };

  const rootClasses = ["lifeos-notification-center", className].filter(Boolean).join(" ");

  const categoryOptions = [
    { value: "", label: "All Categories" },
    ...NOTIFICATION_CATEGORIES.map((cat) => ({
      value: cat,
      label: getCategoryLabel(cat),
    })),
  ];

  return (
    <div className={rootClasses} data-testid="notification-center">
      <div className="lifeos-notification-center__header">
        <div className="lifeos-notification-center__title-row">
          <Text weight="bold" size="lg">
            Notifications
          </Text>
          {unreadCount > 0 ? (
            <CountBadge count={unreadCount} label="unread notifications count" tone="primary" />
          ) : null}
        </div>

        <div className="lifeos-notification-center__header-actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            onClick={handleMarkAllRead}
          >
            <Icon icon={CheckCheck} decorative />
            Mark all read
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={clearAllMutation.isPending || (pageData?.items.length ?? 0) === 0}
            onClick={handleClearAll}
          >
            <Icon icon={Trash2} decorative />
            Clear all
          </Button>

          {onOpenSettings ? (
            <Button variant="ghost" size="sm" onClick={onOpenSettings}>
              <Icon icon={Settings} decorative />
              Preferences
            </Button>
          ) : null}
        </div>
      </div>

      <div className="lifeos-notification-center__toolbar">
        <div className="lifeos-notification-center__filter-group">
          <Checkbox
            label="Unread only"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked);
              setPage(0);
            }}
          />

          <Select
            label="Category"
            value={selectedCategory}
            options={categoryOptions}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setPage(0);
            }}
            className="lifeos-notification-center__category-select"
          />
        </div>
      </div>

      {notificationsQuery.isLoading ? (
        <div
          className="lifeos-notification-center__loading"
          data-testid="notification-center-loading"
        >
          <Skeleton shape="block" height="72px" />
          <Skeleton shape="block" height="72px" />
          <Skeleton shape="block" height="72px" />
        </div>
      ) : notificationsQuery.isError ? (
        <ErrorState
          scope="region"
          title="Unable to load notifications"
          description="Failed to load your notifications from the server. Please try again."
          onRetry={() => notificationsQuery.refetch()}
          data-testid="notification-center-error"
        />
      ) : !pageData || pageData.items.length === 0 ? (
        <div data-testid="notification-center-empty">
          <EmptyState
            variant={unreadOnly || Boolean(selectedCategory) ? "filtered" : "first-use"}
            icon={Bell}
            title="All caught up!"
            description={
              unreadOnly
                ? "You have no unread notifications matching your filters."
                : "You don't have any notifications right now."
            }
          />
        </div>
      ) : (
        <>
          <div className="lifeos-notification-center__list">
            <NotificationGroupedList
              items={pageData.items}
              onMarkRead={handleMarkRead}
              onMarkUnread={handleMarkUnread}
              onClear={handleClear}
              {...(onNavigateTarget ? { onOpenTarget: onNavigateTarget } : {})}
              timeZone={timeZone}
              locale={locale}
            />
          </div>

          {pageData.totalPages > 1 ? (
            <div className="lifeos-notification-center__footer">
              <Pagination
                page={page + 1}
                pageSize={pageSize}
                total={pageData.totalItems}
                label="Notifications pagination"
                onPageChange={(nextPage: number) => setPage(nextPage - 1)}
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
