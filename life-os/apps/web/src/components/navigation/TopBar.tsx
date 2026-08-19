import { useState, type ReactNode } from "react";
import { Bell, EllipsisVertical, Plus, Search } from "lucide-react";

import { CountBadge, IconButton, Text } from "@components/ui";
import { Drawer, useCommandPaletteShortcut } from "@components/feedback";
import { formatLocalDate, todayLocalDate } from "@lib/localDateTime";

import { AccountMenu, type AccountMenuProps } from "./AccountMenu";
import "./top-bar.css";

/**
 * TopBar (LOS-0602).
 *
 * The shell's top utility row per `docs/23-NAVIGATION-AND-ROUTES.md` and
 * `docs/wireframes/02-SHELL-TODAY.md`: date/context, a global search trigger,
 * notifications, Quick Add, focus status, and the account menu. Composes
 * only completed primitives — like `Sidebar`, it renders no data of its own,
 * no `CommandPalette`, and no notification list; every action item is a
 * caller-controlled trigger. The full app shell that mounts this alongside
 * `Sidebar` and decides how their mobile overlays relate is LOS-0603's job.
 *
 * "Adapts without hiding essential mobile actions" (the ticket's own
 * wording): `contextLabel`, Search, and Quick Add stay visible at every
 * width. The formatted date, Notifications, `focusSlot`, and the account
 * menu are secondary — below 768px they collapse behind a single overflow
 * trigger, the same dual-render + CSS-visibility pattern `FilterBar`
 * (LOS-0420) already uses, feeding a `Drawer` sized for `AccountMenu`'s own
 * popover the way `Sidebar`'s `footer` slot already holds arbitrary content.
 */

export interface TopBarProps {
  /** Route/page identity, e.g. "Today". Essential — shown at every width. No auto-derivation; there is no router yet. */
  readonly contextLabel?: string;
  /** The user's confirmed profile timezone. Required, per `todayLocalDate`'s own contract. */
  readonly timeZone: string;
  /** The user's confirmed profile locale. Required, per `formatLocalDate`'s own contract. */
  readonly locale: string;
  /** Injected for deterministic tests. Defaults to `new Date()`. */
  readonly now?: Date;

  /** Fired when the search trigger is activated, by click or Cmd/Ctrl+K. The caller owns rendering `CommandPalette`. */
  readonly onSearchTriggerClick: () => void;
  /** Suppresses the global Cmd/Ctrl+K listener, e.g. while another surface owns keyboard scope. Defaults to enabled. */
  readonly searchShortcutEnabled?: boolean;

  readonly onQuickAddTriggerClick: () => void;

  readonly onNotificationsTriggerClick: () => void;
  /** Unread count shown on the bell's `CountBadge`. Absent or zero renders the bell with no badge. */
  readonly notificationCount?: number;

  /** Caller-owned compact focus-status content, e.g. a `StatusDot`. Nothing renders when absent. */
  readonly focusSlot?: ReactNode;

  /** Composed as-is; TopBar does not re-declare AccountMenu's own contract. */
  readonly account: AccountMenuProps;

  readonly className?: string;
}

export function TopBar({
  contextLabel,
  timeZone,
  locale,
  now,
  onSearchTriggerClick,
  searchShortcutEnabled = true,
  onQuickAddTriggerClick,
  onNotificationsTriggerClick,
  notificationCount,
  focusSlot,
  account,
  className,
}: TopBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);

  useCommandPaletteShortcut(onSearchTriggerClick, { enabled: searchShortcutEnabled });

  const dateLabel = formatLocalDate(todayLocalDate(timeZone, now), locale);
  const hasUnread = notificationCount !== undefined && notificationCount > 0;

  const notificationsButton = (
    <span className="lifeos-topbar__notifications">
      <IconButton icon={Bell} label="Notifications" onClick={onNotificationsTriggerClick} />
      {hasUnread ? (
        <CountBadge
          count={notificationCount as number}
          label="unread notifications"
          className="lifeos-topbar__notifications-badge"
        />
      ) : null}
    </span>
  );

  const secondaryContent = (
    <>
      {notificationsButton}
      {focusSlot ? <span className="lifeos-topbar__focus">{focusSlot}</span> : null}
      <AccountMenu {...account} />
    </>
  );

  const rootClasses = ["lifeos-topbar", className].filter(Boolean).join(" ");

  return (
    <header className={rootClasses}>
      <div className="lifeos-topbar__context">
        {contextLabel ? (
          <Text weight="medium" className="lifeos-topbar__context-label">
            {contextLabel}
          </Text>
        ) : null}
        <Text tone="secondary" size="sm" className="lifeos-topbar__date">
          {dateLabel}
        </Text>
      </div>

      <div className="lifeos-topbar__actions">
        <IconButton icon={Search} label="Search" onClick={onSearchTriggerClick} />
        <IconButton icon={Plus} label="Quick add" onClick={onQuickAddTriggerClick} />

        <span className="lifeos-topbar__secondary lifeos-topbar__secondary--inline">
          {secondaryContent}
        </span>

        <IconButton
          icon={EllipsisVertical}
          label="More"
          aria-expanded={overflowOpen}
          aria-haspopup="dialog"
          className="lifeos-topbar__overflow-trigger"
          onClick={() => setOverflowOpen(true)}
        />
      </div>

      <Drawer
        open={overflowOpen}
        onClose={() => setOverflowOpen(false)}
        title="More"
        placement="end"
        className="lifeos-topbar__overflow-drawer"
      >
        <div className="lifeos-topbar__date-drawer">
          <Text tone="secondary" size="sm">
            {dateLabel}
          </Text>
        </div>
        <div className="lifeos-topbar__secondary lifeos-topbar__secondary--drawer">
          {secondaryContent}
        </div>
      </Drawer>
    </header>
  );
}
