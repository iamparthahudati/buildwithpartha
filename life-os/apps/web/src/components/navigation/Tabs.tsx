import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

import "./tabs.css";

/**
 * Tabs (LOS-0416).
 *
 * The ARIA tabs pattern with automatic activation: moving focus between tabs
 * with the arrow keys selects as it goes, the same as every other roving
 * widget in this design system (`Menu`, LOS-0415) rather than requiring a
 * separate Enter/Space to commit a highlighted-but-not-yet-selected tab.
 *
 * Selection is a plain controlled `selectedId`/`onSelectedIdChange` pair —
 * Tabs has no opinion on whether the caller backs it with `useState` (a
 * "local" tab set, forgotten on navigation) or `useDeepLinkParam` (a "URL"
 * tab set that survives a reload and the browser's Back button), the same
 * "component owns the mechanism, caller owns the state" split `DetailPanel`
 * (LOS-0414) already uses for its own open/closed state.
 *
 * Each panel is mounted only once its tab has been selected at least once,
 * and stays mounted (hidden via the `hidden` attribute, not unmounted) after
 * that — real lazy loading for panel content that fetches on mount, without
 * losing scroll position or local state on every switch back to a tab
 * already visited. `hidden` panels stay in the DOM specifically so the tab's
 * `aria-controls` never points at an element that does not exist.
 */

export interface TabItem {
  readonly id: string;
  readonly label: string;
  /** e.g. a `CountBadge` — caller-supplied, never invented here. */
  readonly badge?: ReactNode;
  readonly disabled?: boolean;
  readonly panel: ReactNode;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly selectedId: string;
  readonly onSelectedIdChange: (id: string) => void;
  /** The tab list's accessible name, e.g. "Project views". */
  readonly label: string;
  readonly className?: string;
}

export function Tabs({ items, selectedId, onSelectedIdChange, label, className }: TabsProps) {
  const instanceId = useId();
  const tabElementId = (id: string) => `${instanceId}-tab-${id}`;
  const panelElementId = (id: string) => `${instanceId}-panel-${id}`;

  const [activatedIds, setActivatedIds] = useState<ReadonlySet<string>>(
    () => new Set(selectedId ? [selectedId] : []),
  );

  // `selectedId` is a controlled prop and can change from outside this
  // component's own click/keyboard handlers — a URL-backed selection moving
  // because of the browser's own Back button, for instance. Adjusted here
  // during render (React's own documented pattern for derived state) rather
  // than in an effect, so the newly selected panel is never left permanently
  // unmounted just because it was never clicked through `select`.
  if (selectedId && !activatedIds.has(selectedId)) {
    setActivatedIds(new Set([...activatedIds, selectedId]));
  }

  const enabledIds = items.filter((item) => !item.disabled).map((item) => item.id);

  function select(id: string) {
    onSelectedIdChange(id);
  }

  function moveFocus(delta: 1 | -1) {
    if (enabledIds.length === 0) {
      return;
    }
    const from = enabledIds.indexOf(selectedId);
    const start = from === -1 ? (delta === 1 ? -1 : enabledIds.length) : from;
    const next = (start + delta + enabledIds.length) % enabledIds.length;
    const nextId = enabledIds[next];
    if (nextId !== undefined) {
      select(nextId);
      document.getElementById(tabElementId(nextId))?.focus();
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        moveFocus(1);
        return;
      case "ArrowLeft":
        event.preventDefault();
        moveFocus(-1);
        return;
      case "Home": {
        event.preventDefault();
        const first = enabledIds[0];
        if (first !== undefined) {
          select(first);
          document.getElementById(tabElementId(first))?.focus();
        }
        return;
      }
      case "End": {
        event.preventDefault();
        const last = enabledIds[enabledIds.length - 1];
        if (last !== undefined) {
          select(last);
          document.getElementById(tabElementId(last))?.focus();
        }
        return;
      }
      default:
        return;
    }
  }

  return (
    <div className={["lifeos-tabs", className].filter(Boolean).join(" ")}>
      <div role="tablist" aria-label={label} className="lifeos-tabs__list">
        {items.map((item) => {
          const selected = item.id === selectedId;
          return (
            <button
              key={item.id}
              id={tabElementId(item.id)}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelElementId(item.id)}
              tabIndex={selected ? 0 : -1}
              disabled={item.disabled}
              className={["lifeos-tabs__tab", selected && "is-selected"].filter(Boolean).join(" ")}
              onClick={() => select(item.id)}
              onKeyDown={handleKeyDown}
            >
              {item.label}
              {item.badge}
            </button>
          );
        })}
      </div>

      {items.map((item) => {
        if (!activatedIds.has(item.id)) {
          return null;
        }
        const selected = item.id === selectedId;
        return (
          <div
            key={item.id}
            id={panelElementId(item.id)}
            role="tabpanel"
            aria-labelledby={tabElementId(item.id)}
            tabIndex={item.panel == null ? -1 : 0}
            hidden={!selected || item.panel == null}
            className={["lifeos-tabs__panel", item.panel == null && "lifeos-tabs__panel--empty"]
              .filter(Boolean)
              .join(" ")}
          >
            {item.panel}
          </div>
        );
      })}
    </div>
  );
}
