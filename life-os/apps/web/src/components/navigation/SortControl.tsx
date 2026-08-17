import { ArrowDown, ArrowUp } from "lucide-react";

import { Button, VisuallyHidden } from "@components/ui";

import { Menu, type MenuItemDescriptor } from "./Menu";
import "./sort-control.css";

/**
 * SortControl (LOS-0422).
 *
 * One trigger showing the current sort as a stable label — "Sort: Name,
 * ascending" — rather than an arrow with no accompanying text, which
 * carries direction by shape and color alone. Reuses `Menu` (LOS-0415) for
 * the field picker instead of a second dropdown pattern, matching every
 * other trigger-plus-popup composition in this design system.
 *
 * Picking the field that is already selected toggles its direction — the
 * one interaction a user reaching for "sort by the same thing, reversed"
 * actually wants — rather than requiring a second, separate control just
 * for direction. Picking a different field keeps the current direction
 * unchanged, since nothing here can guess which direction is more natural
 * for a caller's own field (`"Date created"` descending and `"Name"`
 * ascending are both someone's sensible default).
 */

export type SortDirection = "asc" | "desc";

export interface SortOption {
  readonly id: string;
  readonly label: string;
}

export interface SortState {
  readonly optionId: string;
  readonly direction: SortDirection;
}

export interface SortControlProps {
  readonly options: readonly SortOption[];
  readonly value: SortState;
  readonly onChange: (value: SortState) => void;
  /** The menu's accessible name, e.g. "Sort tasks by". Never visible text. */
  readonly label?: string;
  readonly className?: string;
}

const DIRECTION_WORD: Record<SortDirection, string> = {
  asc: "ascending",
  desc: "descending",
};

export function SortControl({
  options,
  value,
  onChange,
  label = "Sort by",
  className,
}: SortControlProps) {
  const current = options.find((option) => option.id === value.optionId);
  const currentLabel = current?.label ?? "";

  const items: readonly MenuItemDescriptor[] = options.map((option) => ({
    type: "item",
    id: option.id,
    label: option.label,
    onSelect: () => {
      if (option.id === value.optionId) {
        onChange({ optionId: option.id, direction: value.direction === "asc" ? "desc" : "asc" });
      } else {
        onChange({ optionId: option.id, direction: value.direction });
      }
    },
  }));

  return (
    <Menu
      trigger={
        <Button
          variant="secondary"
          iconStart={value.direction === "asc" ? ArrowUp : ArrowDown}
          className={["lifeos-sort-control", className].filter(Boolean).join(" ")}
        >
          Sort: {currentLabel}
          <VisuallyHidden>, {DIRECTION_WORD[value.direction]}</VisuallyHidden>
        </Button>
      }
      items={items}
      label={label}
    />
  );
}
