import { useState, type ReactNode } from "react";
import { SlidersHorizontal, X } from "lucide-react";

import { Drawer } from "@components/feedback";
import { Button, CountBadge, IconButton, Icon, Text } from "@components/ui";
import "./filter-bar.css";

/**
 * FilterBar (LOS-0420).
 *
 * The shell around a screen's own filter controls — `FilterBar` has no
 * domain filters of its own, matching the "no domain columns hardcoded"
 * principle `DataTable`'s own ticket states. `children` is whatever the
 * screen actually filters by (a `Select`, a `DateRangeField`, a
 * `Combobox`); this component supplies the layout, the active-filter chip
 * row, the result count, "Clear all" and the mobile collapse — never the
 * fields themselves.
 *
 * The mobile collapse renders `children` twice — once inline for a wide
 * viewport, once inside a `Drawer` (LOS-0414) opened from a "Filters"
 * button — with CSS choosing which is visible, rather than a JS media-query
 * hook deciding whether to mount the `Drawer` at all. Both copies read from
 * the same caller-owned controlled state, so they always agree; this is the
 * same "automatic by breakpoint" responsiveness every other composed
 * component in this design system already uses, just achieved by hiding one
 * of two renders instead of a single CSS rule, because a Drawer is a real
 * mounted overlay rather than something `@media` alone can reposition.
 *
 * The URL round-trip for whatever filter state the caller keeps is a
 * separate, pure contract — see `filterUrlContract.ts` — not something this
 * component wires up itself.
 */

export interface ActiveFilterChip {
  readonly id: string;
  /** e.g. "Status: Open" — caller-formatted, never invented here. */
  readonly label: string;
  readonly onRemove: () => void;
}

export interface FilterBarProps {
  /** The screen's own filter controls. */
  readonly children: ReactNode;
  readonly activeChips?: readonly ActiveFilterChip[];
  /** e.g. "128 tasks" — caller-formatted, since only it knows the noun. */
  readonly resultCount?: string;
  /** Shown only when there is at least one active chip. */
  readonly onClearAll?: () => void;
  readonly className?: string;
}

export function FilterBar({
  children,
  activeChips = [],
  resultCount,
  onClearAll,
  className,
}: FilterBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const hasActiveChips = activeChips.length > 0;

  return (
    <div className={["lifeos-filter-bar", className].filter(Boolean).join(" ")}>
      <div className="lifeos-filter-bar__row">
        <div className="lifeos-filter-bar__controls lifeos-filter-bar__controls--inline">
          {children}
        </div>

        <Button
          variant="secondary"
          size="sm"
          className="lifeos-filter-bar__mobile-trigger"
          onClick={() => setDrawerOpen(true)}
        >
          <Icon icon={SlidersHorizontal} decorative size="sm" />
          Filters
          {hasActiveChips ? <CountBadge count={activeChips.length} label="active filters" /> : null}
        </Button>

        {resultCount ? (
          <Text tone="secondary" size="sm" className="lifeos-filter-bar__count">
            {resultCount}
          </Text>
        ) : null}
      </div>

      {hasActiveChips ? (
        <div className="lifeos-filter-bar__chips">
          {activeChips.map((chip) => (
            <span key={chip.id} className="lifeos-filter-bar__chip">
              {chip.label}
              <IconButton
                icon={X}
                label={`Remove ${chip.label} filter`}
                size="sm"
                variant="ghost"
                onClick={chip.onRemove}
              />
            </span>
          ))}
          {onClearAll ? (
            <Button variant="link" size="sm" onClick={onClearAll}>
              Clear all
            </Button>
          ) : null}
        </div>
      ) : null}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Filters"
        placement="bottom"
        className="lifeos-filter-bar__drawer"
      >
        <div className="lifeos-filter-bar__controls">{children}</div>
      </Drawer>
    </div>
  );
}
