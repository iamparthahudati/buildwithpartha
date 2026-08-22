import { useState, useCallback, type MouseEvent, type ReactNode } from "react";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

import { Badge, CountBadge, Divider, Icon, IconButton, Logo, Tooltip } from "@components/ui";
import { Drawer } from "@components/feedback";

import {
  DEFAULT_NAV_GROUPS,
  isNavDestinationActive,
  type NavDestination,
  type NavGroup,
} from "./navigationDestinations";
import { getStoredSidebarCollapsed, setStoredSidebarCollapsed } from "./sidebarStorage";
import "./sidebar.css";

/**
 * Responsive Sidebar Navigation (LOS-0601).
 *
 * Implements the LifeOS navigation shell left-rail per `docs/23-NAVIGATION-AND-ROUTES.md`,
 * `docs/22-INFORMATION-ARCHITECTURE.md`, and `docs/wireframes/02-SHELL-TODAY.md`:
 *
 * - Persistent/collapsible desktop sidebar (`--lifeos-layout-sidebar-width`: 240px).
 * - Compact collapsed rail for tablet/desktop with accessible tooltips on hover/focus.
 * - Modal navigation drawer for small viewports (<768px) with focus trap.
 * - Grouped canonical destinations (Execute, Plan, Capture and grow, Reflect).
 * - Active route state styling with `aria-current="page"`.
 * - First-tab-stop skip link pointing to main content.
 * - Non-sensitive device collapse preference remembered in localStorage.
 */

export interface SidebarProps {
  /**
   * Current active route pathname (e.g. `"/life-os/app/tasks"`).
   * Used to highlight the active destination with `aria-current="page"`.
   * Defaults to `window.location.pathname` when available.
   */
  readonly currentPath?: string;
  /**
   * Controlled collapse state. When true, sidebar renders as a compact rail.
   */
  readonly collapsed?: boolean;
  /**
   * Initial collapse state for uncontrolled usage.
   * Defaults to reading stored preference via `getStoredSidebarCollapsed()`.
   */
  readonly defaultCollapsed?: boolean;
  /**
   * Callback fired when collapse state changes.
   */
  readonly onCollapsedChange?: (collapsed: boolean) => void;
  /**
   * Navigation destinations and groups. Defaults to canonical `DEFAULT_NAV_GROUPS`.
   */
  readonly groups?: readonly NavGroup[];
  /**
   * Optional custom click/navigate handler for navigation links.
   */
  readonly onNavigate?: (href: string, event: MouseEvent<HTMLAnchorElement>) => void;
  /**
   * Target ID for the skip link. Defaults to `"main-content"`.
   */
  readonly skipLinkId?: string;
  /**
   * Accessible label for the skip link. Defaults to `"Skip to main content"`.
   */
  readonly skipLinkLabel?: string;
  /**
   * Whether to render as a modal navigation drawer (for mobile viewport).
   */
  readonly drawer?: boolean;
  /**
   * If `drawer` is true, whether the drawer is open.
   */
  readonly drawerOpen?: boolean;
  /**
   * Callback when closing the drawer.
   */
  readonly onDrawerClose?: () => void;
  /**
   * Optional custom footer content (e.g. Settings link, Focus mini-player, account info).
   */
  readonly footer?: ReactNode;
  /**
   * Optional header actions or extra elements.
   */
  readonly headerAction?: ReactNode;
  /**
   * Home link URL for the logo mark. Defaults to `"/life-os/app/today"`.
   */
  readonly homeHref?: string;
  /**
   * Optional additional class name.
   */
  readonly className?: string;
}

export function Sidebar({
  currentPath,
  collapsed: controlledCollapsed,
  defaultCollapsed,
  onCollapsedChange,
  groups = DEFAULT_NAV_GROUPS,
  onNavigate,
  skipLinkId = "main-content",
  skipLinkLabel = "Skip to main content",
  drawer = false,
  drawerOpen = false,
  onDrawerClose,
  footer,
  headerAction,
  homeHref = "/life-os/app/today",
  className,
}: SidebarProps) {
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = useState<boolean>(() => {
    if (defaultCollapsed !== undefined) {
      return defaultCollapsed;
    }
    return getStoredSidebarCollapsed();
  });

  const isControlled = controlledCollapsed !== undefined;
  const isCollapsed = isControlled ? controlledCollapsed : uncontrolledCollapsed;

  const resolvedCurrentPath =
    currentPath ??
    (typeof window !== "undefined" ? window.location.pathname : "/life-os/app/today");

  const handleToggleCollapse = useCallback(() => {
    const nextCollapsed = !isCollapsed;
    if (!isControlled) {
      setUncontrolledCollapsed(nextCollapsed);
      setStoredSidebarCollapsed(nextCollapsed);
    }
    onCollapsedChange?.(nextCollapsed);
  }, [isCollapsed, isControlled, onCollapsedChange]);

  const handleLinkClick = useCallback(
    (href: string, event: MouseEvent<HTMLAnchorElement>) => {
      onNavigate?.(href, event);
      if (drawer && onDrawerClose) {
        onDrawerClose();
      }
    },
    [drawer, onDrawerClose, onNavigate],
  );

  const renderNavContent = (collapsedView: boolean) => (
    <nav className="lifeos-sidebar__nav" aria-label="Main navigation">
      {groups.map((group, groupIndex) => {
        const groupHeadingId = `lifeos-sidebar-group-${group.id}`;
        return (
          <div key={group.id} className="lifeos-sidebar__group">
            {collapsedView ? (
              <>
                <h2 id={groupHeadingId} className="lifeos-visually-hidden">
                  {group.title}
                </h2>
                {groupIndex > 0 ? <Divider className="lifeos-sidebar__group-divider" /> : null}
              </>
            ) : (
              <h2 id={groupHeadingId} className="lifeos-sidebar__group-title">
                {group.title}
              </h2>
            )}

            <ul className="lifeos-sidebar__list" aria-labelledby={groupHeadingId}>
              {group.items.map((item: NavDestination) => {
                const isActive = isNavDestinationActive(resolvedCurrentPath, item.href);

                const itemLink = (
                  <a
                    href={item.href}
                    className={[
                      "lifeos-sidebar__link",
                      collapsedView && "lifeos-sidebar__link--rail",
                      isActive && "lifeos-sidebar__link--active",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    aria-label={collapsedView ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    onClick={(e) => handleLinkClick(item.href, e)}
                  >
                    <span className="lifeos-sidebar__icon-frame">
                      <Icon icon={item.icon} decorative size="sm" />
                    </span>
                    {!collapsedView ? (
                      <>
                        <span className="lifeos-sidebar__label">{item.label}</span>
                        {item.badge !== undefined ? (
                          typeof item.badge === "number" ? (
                            <CountBadge
                              count={item.badge}
                              label={item.badgeLabel ?? item.label}
                              tone={item.badgeTone ?? (isActive ? "primary" : "neutral")}
                              className="lifeos-sidebar__badge"
                            />
                          ) : (
                            <Badge
                              tone={item.badgeTone ?? (isActive ? "primary" : "neutral")}
                              className="lifeos-sidebar__badge"
                            >
                              {item.badge}
                            </Badge>
                          )
                        ) : null}
                      </>
                    ) : null}
                  </a>
                );

                return (
                  <li key={item.id} className="lifeos-sidebar__list-item">
                    {collapsedView ? (
                      <Tooltip content={item.label} placement="bottom">
                        {itemLink}
                      </Tooltip>
                    ) : (
                      itemLink
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  // Render modal drawer variant for mobile viewports
  if (drawer) {
    return (
      <Drawer
        open={drawerOpen}
        onClose={onDrawerClose ?? (() => {})}
        title="Navigation"
        placement="start"
        className={["lifeos-sidebar-drawer", className].filter(Boolean).join(" ")}
      >
        <div className="lifeos-sidebar__body">{renderNavContent(false)}</div>
        {footer ? <div className="lifeos-sidebar__footer">{footer}</div> : null}
      </Drawer>
    );
  }

  const rootClasses = ["lifeos-sidebar", isCollapsed && "lifeos-sidebar--collapsed", className]
    .filter(Boolean)
    .join(" ");

  const toggleButton = (
    <IconButton
      icon={isCollapsed ? ChevronsRight : ChevronsLeft}
      label={isCollapsed ? "Expand navigation" : "Collapse navigation"}
      aria-expanded={!isCollapsed}
      variant="ghost"
      size="sm"
      className="lifeos-sidebar__toggle"
      onClick={handleToggleCollapse}
    />
  );

  return (
    <aside className={rootClasses} aria-label="Sidebar navigation">
      <a className="lifeos-skip-link" href={`#${skipLinkId}`}>
        {skipLinkLabel}
      </a>

      <div className="lifeos-sidebar__header">
        <a
          href={homeHref}
          className="lifeos-sidebar__brand"
          aria-label="LifeOS home"
          onClick={(e) => handleLinkClick(homeHref, e)}
        >
          {isCollapsed ? (
            <Logo variant="symbol" size="md" label="LifeOS" />
          ) : (
            <Logo variant="lockup" size="md" />
          )}
        </a>

        {!isCollapsed && headerAction ? (
          <div className="lifeos-sidebar__header-action">{headerAction}</div>
        ) : null}

        {isCollapsed ? (
          <Tooltip content="Expand navigation" placement="bottom">
            {toggleButton}
          </Tooltip>
        ) : (
          toggleButton
        )}
      </div>

      <div className="lifeos-sidebar__body">{renderNavContent(isCollapsed)}</div>

      {footer ? <div className="lifeos-sidebar__footer">{footer}</div> : null}
    </aside>
  );
}
