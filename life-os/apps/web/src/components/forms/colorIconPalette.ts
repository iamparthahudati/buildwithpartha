import {
  BookOpen,
  Briefcase,
  Dumbbell,
  Flag,
  Folder,
  Heart,
  Home,
  Lightbulb,
  Palette,
  Rocket,
  Star,
  Target,
  type LucideIcon,
} from "lucide-react";

/**
 * The approved palette and icon list for `ColorIconPicker` (LOS-0407).
 *
 * Project and Habit both carry a "color/icon" appearance
 * (`04-DOMAIN-MODEL.md`). Kept apart from `ColorIconPicker.tsx` so that file
 * exports only its component and this one only data — the same reason
 * `dateRangePresets.ts` and `formFixtures.ts` sit apart from the components
 * that consume them.
 */

export type ColorSwatchName =
  "blue" | "green" | "amber" | "purple" | "teal" | "red" | "magenta" | "olive";

export interface ColorSwatch {
  readonly name: ColorSwatchName;
  /** The accessible and visible name of the color. */
  readonly label: string;
  /** The frozen token this name currently resolves to (LOS-0301). */
  readonly token: string;
}

/**
 * Reuses the eight frozen categorical chart tokens (LOS-0301) rather than
 * introducing a second color scale: every raw hex value in LifeOS is
 * required to live in `styles/tokens.css`, and this is the one existing set
 * of eight colors already chosen to be distinguishable from each other. Each
 * one is independently proven to clear WCAG AA (4.5:1) as a solid fill under
 * a white icon in `ColorIconPicker.test.tsx`, the same way
 * `styles/tokens.test.ts` proves the frozen status-color pairings.
 *
 * The stored value is the `name`, never the token or its hex — a future
 * repaint of the palette's actual colors changes nothing about data already
 * saved, the same reason a Task's status is stored as `TO_DO` rather than as
 * whatever color currently represents it.
 */
export const COLOR_SWATCHES: readonly ColorSwatch[] = Object.freeze([
  { name: "blue", label: "Blue", token: "--lifeos-chart-1" },
  { name: "green", label: "Green", token: "--lifeos-chart-2" },
  { name: "amber", label: "Amber", token: "--lifeos-chart-3" },
  { name: "purple", label: "Purple", token: "--lifeos-chart-4" },
  { name: "teal", label: "Teal", token: "--lifeos-chart-5" },
  { name: "red", label: "Red", token: "--lifeos-chart-6" },
  { name: "magenta", label: "Magenta", token: "--lifeos-chart-7" },
  { name: "olive", label: "Olive", token: "--lifeos-chart-8" },
]);

export type IconOptionName =
  | "folder"
  | "briefcase"
  | "target"
  | "flag"
  | "star"
  | "book-open"
  | "home"
  | "heart"
  | "dumbbell"
  | "palette"
  | "rocket"
  | "lightbulb";

export interface IconOption {
  readonly name: IconOptionName;
  /** The accessible and visible name of the icon. */
  readonly label: string;
  readonly icon: LucideIcon;
}

/**
 * A small curated list from the approved set (lucide-react, ADR-013) — not
 * "every icon in the library", which would turn a quick appearance choice
 * into an unbounded search. `11-PRODUCT-SPECIFICATION.md` §47 requires one
 * coherent outline set with accessible labels for icon-only controls and
 * forbids mixing emoji with product icons, which is why this list stays
 * within the same set every other LifeOS icon comes from.
 */
export const ICON_OPTIONS: readonly IconOption[] = Object.freeze([
  { name: "folder", label: "Folder", icon: Folder },
  { name: "briefcase", label: "Briefcase", icon: Briefcase },
  { name: "target", label: "Target", icon: Target },
  { name: "flag", label: "Flag", icon: Flag },
  { name: "star", label: "Star", icon: Star },
  { name: "book-open", label: "Book", icon: BookOpen },
  { name: "home", label: "Home", icon: Home },
  { name: "heart", label: "Heart", icon: Heart },
  { name: "dumbbell", label: "Fitness", icon: Dumbbell },
  { name: "palette", label: "Creative", icon: Palette },
  { name: "rocket", label: "Launch", icon: Rocket },
  { name: "lightbulb", label: "Idea", icon: Lightbulb },
]);
