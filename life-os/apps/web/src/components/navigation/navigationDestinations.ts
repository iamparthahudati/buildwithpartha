import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Clock,
  FileSpreadsheet,
  FileText,
  Folder,
  Inbox,
  Repeat,
  RotateCcw,
  Sun,
  Target,
  TrendingUp,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { BadgeTone } from "@components/ui";

/**
 * Primary navigation destination contract (LOS-0601).
 *
 * Each destination corresponds to a canonical protected route defined in
 * `docs/23-NAVIGATION-AND-ROUTES.md` and `docs/22-INFORMATION-ARCHITECTURE.md`.
 */
export interface NavDestination {
  readonly id: string;
  readonly label: string;
  readonly href: string;
  readonly icon: LucideIcon;
  readonly badge?: number | string | undefined;
  readonly badgeLabel?: string | undefined;
  readonly badgeTone?: BadgeTone | undefined;
}

/**
 * Grouped navigation structure.
 */
export interface NavGroup {
  readonly id: string;
  readonly title: string;
  readonly items: readonly NavDestination[];
}

/**
 * Canonical 4 navigation groups and 14 destinations per
 * `docs/22-INFORMATION-ARCHITECTURE.md` §18 and `docs/wireframes/02-SHELL-TODAY.md`.
 */
export const DEFAULT_NAV_GROUPS: readonly NavGroup[] = Object.freeze([
  {
    id: "execute",
    title: "Execute",
    items: Object.freeze([
      {
        id: "today",
        label: "Today",
        href: "/life-os/app/today",
        icon: Sun,
      },
      {
        id: "tasks",
        label: "Tasks",
        href: "/life-os/app/tasks",
        icon: CheckSquare,
      },
      {
        id: "time-blocks",
        label: "Time Blocks",
        href: "/life-os/app/time-blocks",
        icon: Clock,
      },
    ]),
  },
  {
    id: "plan",
    title: "Plan",
    items: Object.freeze([
      {
        id: "projects",
        label: "Projects",
        href: "/life-os/app/projects",
        icon: Folder,
      },
      {
        id: "sprints",
        label: "Sprints",
        href: "/life-os/app/sprints",
        icon: Zap,
      },
      {
        id: "week-planner",
        label: "Week Planner",
        href: "/life-os/app/week-planner",
        icon: CalendarDays,
      },
      {
        id: "calendar",
        label: "Calendar",
        href: "/life-os/app/calendar",
        icon: Calendar,
      },
      {
        id: "goals",
        label: "Goals",
        href: "/life-os/app/goals",
        icon: Target,
      },
    ]),
  },
  {
    id: "capture-and-grow",
    title: "Capture and grow",
    items: Object.freeze([
      {
        id: "notes",
        label: "Notes",
        href: "/life-os/app/notes",
        icon: FileText,
      },
      {
        id: "brain-dump",
        label: "Brain Dump",
        href: "/life-os/app/brain-dump",
        icon: Inbox,
      },
      {
        id: "habits",
        label: "Habits",
        href: "/life-os/app/habits",
        icon: Repeat,
      },
    ]),
  },
  {
    id: "reflect",
    title: "Reflect",
    items: Object.freeze([
      {
        id: "progress",
        label: "Progress",
        href: "/life-os/app/progress",
        icon: TrendingUp,
      },
      {
        id: "reports",
        label: "Reports",
        href: "/life-os/app/reports",
        icon: FileSpreadsheet,
      },
      {
        id: "reviews",
        label: "Reviews",
        href: "/life-os/app/reviews",
        icon: RotateCcw,
      },
    ]),
  },
]);

/**
 * Destinations reachable in the app but deliberately absent from the
 * sidebar (LOS-0107/`22-INFORMATION-ARCHITECTURE.md`: Search, Notifications
 * and Settings are opened from `TopBar`/`AccountMenu` triggers, not a
 * sidebar link) plus Onboarding, which has no persistent nav entry at all.
 * Kept here rather than duplicated, so `resolveRouteTitle` has one list to
 * search alongside `DEFAULT_NAV_GROUPS`.
 */
const EXTRA_ROUTE_DESTINATIONS: readonly Pick<NavDestination, "href" | "label">[] = Object.freeze([
  { href: "/life-os/app/onboarding", label: "Onboarding" },
  { href: "/life-os/app/settings", label: "Settings" },
  { href: "/life-os/app/search", label: "Search" },
  { href: "/life-os/app/notifications", label: "Notifications" },
]);

/**
 * Resolves the current route's product-facing title (LOS-0603).
 *
 * The one place `AppShell` and every not-yet-built placeholder route ask
 * "what page is this," reusing the same prefix-matching
 * `isNavDestinationActive` already uses for the sidebar's own active state
 * rather than a second, divergent notion of "current route." Doubles as
 * `TopBar`'s `contextLabel` and the text moved into the route-change live
 * region, so the two always agree.
 */
export function resolveRouteTitle(pathname: string): string {
  const allDestinations = [
    ...DEFAULT_NAV_GROUPS.flatMap((group) => group.items),
    ...EXTRA_ROUTE_DESTINATIONS,
  ];

  const match = allDestinations.find((destination) =>
    isNavDestinationActive(pathname, destination.href),
  );

  return match?.label ?? "LifeOS";
}

/**
 * Resolves whether a destination is currently active based on the current pathname.
 * Handles exact matches, nested detail sub-routes (e.g. `/tasks/:id`), and default `/life-os/app`.
 */
export function isNavDestinationActive(currentPath: string, destinationHref: string): boolean {
  if (!currentPath || !destinationHref) {
    return false;
  }

  // Normalize trailing slashes
  const normalizedCurrent =
    currentPath.length > 1 && currentPath.endsWith("/") ? currentPath.slice(0, -1) : currentPath;
  const normalizedDest =
    destinationHref.length > 1 && destinationHref.endsWith("/")
      ? destinationHref.slice(0, -1)
      : destinationHref;

  if (normalizedCurrent === normalizedDest) {
    return true;
  }

  // Root app path aliases to Today
  if (
    normalizedDest === "/life-os/app/today" &&
    (normalizedCurrent === "/life-os/app" || normalizedCurrent === "/life-os/app/")
  ) {
    return true;
  }

  // Subroutes under destination (e.g., /life-os/app/tasks/123 under /life-os/app/tasks)
  if (normalizedCurrent.startsWith(`${normalizedDest}/`)) {
    return true;
  }

  return false;
}
