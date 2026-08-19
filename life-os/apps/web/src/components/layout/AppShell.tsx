import { useEffect, useRef, useState } from "react";
import { Menu as MenuIcon } from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { IconButton } from "@components/ui";
import { ErrorBoundary, ToastViewport } from "@components/feedback";
import {
  Sidebar,
  TopBar,
  resolveRouteTitle,
  type MenuItemDescriptor,
} from "@components/navigation";
import { useAnnouncer } from "@hooks/useAnnouncer";
import { useMediaQuery } from "@hooks/useMediaQuery";

import "./app-shell.css";

const MOBILE_QUERY = "(max-width: 767px)";
const MAIN_CONTENT_ID = "lifeos-main-content";

/**
 * AppShell (LOS-0603).
 *
 * Composes `Sidebar` (LOS-0601) and `TopBar` (LOS-0602) — both self-contained,
 * independently built components neither of which knows the other exists —
 * around the routed `main` content, per `docs/wireframes/02-SHELL-TODAY.md`'s
 * "large/small application shell" and `23-NAVIGATION-AND-ROUTES.md`'s
 * accessibility contract. Mounted only inside the protected route subtree
 * (`app/AppRouter.tsx`), under `RequireAuth`.
 *
 * **Skip link.** `Sidebar` only renders its own skip link in its normal
 * (`drawer={false}`) mode — its `drawer` mode renders nothing at all while
 * closed (`Drawer` returns `null`). Since this shell renders exactly one
 * `Sidebar` instance and switches its `drawer` prop by viewport, relying on
 * `Sidebar`'s own skip link alone would leave a mobile viewport with a
 * closed drawer — the default state — with no skip link at all. `AppShell`
 * fills exactly that gap with its own, shown only while `isMobile`;
 * `skipLinkId` is passed through to `Sidebar` either way so its own skip
 * link (desktop) points at the real `main`, not its unrelated default. The
 * two are deliberately never both present, so there is exactly one skip
 * link — and one accessible name — at any viewport.
 *
 * **DOM order.** `Sidebar` renders before the header row that carries
 * `TopBar`, so the skip link is the document's first interactive element
 * regardless of visual (CSS) layout, per LOS-0602's own handoff note.
 *
 * **Mobile navigation.** `TopBar` has no menu/hamburger trigger of its own
 * (the mobile wireframe's `[Menu]` sits to `TopBar`'s own left, outside its
 * boundary) and `Sidebar`'s `drawer` mode has no viewport detection of its
 * own — both are deliberate, since neither component owns a breakpoint
 * decision the other doesn't share. `AppShell` is where that decision lives:
 * `useMediaQuery` decides `Sidebar`'s mode, and `AppShell` renders the one
 * button that opens it. `TopBar`'s own "More" overflow drawer (LOS-0602)
 * stays exactly as built — a second, independent mobile trigger for a
 * different set of actions (Notifications/focus/Account), not consolidated
 * with navigation. Merging the two would mean reaching into either
 * component's internals; keeping them separate keeps both self-contained.
 *
 * **Overlay root.** `#lifeos-overlay-root` is a reserved mount point for
 * portal-based overlays. `Dialog`/`Drawer`/`CommandPalette` (LOS-0412/0414/
 * LOS-0421) render in place today, not through a portal — introducing one
 * would mean revisiting each of those already-shipped, already-tested
 * components, which is not this ticket's job. `ToastViewport` (LOS-0409) is
 * mounted here now because nothing mounted it anywhere before this ticket;
 * `ToastProvider`'s queue existed with no visible surface.
 *
 * **Focus and announcement on navigation.** `23-NAVIGATION-AND-ROUTES.md`:
 * "Route changes move focus to the page heading or a deliberate focus
 * target and announce the new title once." `main`'s own `tabIndex={-1}` is
 * that deliberate target (the same pattern `App.tsx`'s LOS-0201 placeholder
 * already established), and `useAnnouncer` (LOS-0327) is the "announce ...
 * once" half — it exists specifically to keep a live region from being
 * spammed, which a naive `aria-live` write on every render would do. Both
 * are skipped on the very first render: stealing focus from wherever the
 * browser or a deep link already placed it on initial load is not what
 * "route changes" means.
 */

export interface AppShellProps {
  readonly displayName: string;
  readonly email: string;
  readonly timeZone: string;
  readonly locale: string;
  /** No canonical route exists for Quick Add (LOS-0604) — it is a dialog, not a page. */
  readonly onQuickAddTriggerClick: () => void;
  readonly onSignOut: () => void;
  /** Injected for deterministic tests; forwarded to `TopBar`. */
  readonly now?: Date;
}

export function AppShell({
  displayName,
  email,
  timeZone,
  locale,
  onQuickAddTriggerClick,
  onSignOut,
  now,
}: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const { message, announce } = useAnnouncer();
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Resets the drawer's open state (not just the derived prop below) the
  // moment the viewport leaves mobile, so it does not silently reappear
  // open if the viewport later shrinks back. Subscribes directly to the
  // same query rather than reacting to `isMobile` in the effect body: the
  // setState only ever runs inside the change-event callback, never
  // synchronously within the effect itself.
  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_QUERY);
    const handleChange = (event: MediaQueryListEvent) => {
      if (!event.matches) {
        setMobileNavOpen(false);
      }
    };
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  const title = resolveRouteTitle(location.pathname);

  useEffect(() => {
    document.title = title === "LifeOS" ? "LifeOS" : `${title} · LifeOS`;
  }, [title]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
    announce(title);
    // Only a real navigation (pathname change) should refocus/announce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const accountItems: readonly MenuItemDescriptor[] = [
    {
      type: "item",
      id: "settings",
      label: "Settings",
      onSelect: () => navigate("/life-os/app/settings"),
    },
    { type: "separator", id: "account-separator" },
    { type: "item", id: "sign-out", label: "Sign out", onSelect: onSignOut },
  ];

  return (
    <div className="lifeos-app-shell">
      {isMobile ? (
        <a className="lifeos-skip-link" href={`#${MAIN_CONTENT_ID}`}>
          Skip to main content
        </a>
      ) : null}

      <Sidebar
        currentPath={location.pathname}
        onNavigate={(href, event) => {
          event.preventDefault();
          navigate(href);
        }}
        skipLinkId={MAIN_CONTENT_ID}
        drawer={isMobile}
        drawerOpen={isMobile && mobileNavOpen}
        onDrawerClose={() => setMobileNavOpen(false)}
      />

      <div className="lifeos-app-shell__content">
        <div className="lifeos-app-shell__header">
          <IconButton
            icon={MenuIcon}
            label="Open navigation"
            aria-haspopup="dialog"
            aria-expanded={mobileNavOpen}
            variant="ghost"
            className="lifeos-app-shell__menu-trigger"
            onClick={() => setMobileNavOpen(true)}
          />
          <TopBar
            className="lifeos-app-shell__topbar"
            contextLabel={title}
            timeZone={timeZone}
            locale={locale}
            {...(now ? { now } : {})}
            onSearchTriggerClick={() => navigate("/life-os/app/search")}
            onQuickAddTriggerClick={onQuickAddTriggerClick}
            onNotificationsTriggerClick={() => navigate("/life-os/app/notifications")}
            account={{ name: displayName, email, items: accountItems }}
          />
        </div>

        <main ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className="lifeos-app-shell__main">
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <div id="lifeos-overlay-root" className="lifeos-app-shell__overlay-root">
        <ToastViewport />
      </div>

      <div aria-live="polite" role="status" className="lifeos-visually-hidden">
        {message}
      </div>
    </div>
  );
}
