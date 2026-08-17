import { LayoutGrid, List, Table } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { IconButton } from "@components/ui";
import "./view-toggle.css";

/**
 * ViewToggle (LOS-0422).
 *
 * A real `role="group"` of real `<button>`s, each carrying `aria-pressed`
 * for the selected view — the ARIA "toggle button group" pattern, not a
 * `radiogroup`. A view preference is presentation, not a set of mutually
 * exclusive *answers* the way a radio group's options are; `aria-pressed`
 * says "this is currently on," which is the honest description of what a
 * view toggle actually is.
 *
 * The three modes are a closed set, not a caller-supplied list — "list,
 * grid, table" is this design system's own fixed vocabulary for a view
 * preference (per the ticket itself), not domain data the way `FilterBar`'s
 * filter fields or `Menu`'s items are. `modes` narrows which of the three
 * are offered; it does not add a fourth.
 */

export type ViewMode = "list" | "grid" | "table";

const VIEW_ICON: Record<ViewMode, LucideIcon> = {
  list: List,
  grid: LayoutGrid,
  table: Table,
};

const VIEW_LABEL: Record<ViewMode, string> = {
  list: "List view",
  grid: "Grid view",
  table: "Table view",
};

const ALL_MODES: readonly ViewMode[] = ["list", "grid", "table"];

export interface ViewToggleProps {
  readonly value: ViewMode;
  readonly onChange: (mode: ViewMode) => void;
  /** Restricts which of the three modes are offered. Defaults to all three. */
  readonly modes?: readonly ViewMode[];
  /** The group's accessible name, e.g. "Task list view". */
  readonly label?: string;
  readonly className?: string;
}

export function ViewToggle({
  value,
  onChange,
  modes = ALL_MODES,
  label = "View",
  className,
}: ViewToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className={["lifeos-view-toggle", className].filter(Boolean).join(" ")}
    >
      {modes.map((mode) => (
        <IconButton
          key={mode}
          icon={VIEW_ICON[mode]}
          label={VIEW_LABEL[mode]}
          variant="ghost"
          aria-pressed={mode === value}
          className={["lifeos-view-toggle__button", mode === value && "is-pressed"]
            .filter(Boolean)
            .join(" ")}
          onClick={() => onChange(mode)}
        />
      ))}
    </div>
  );
}
