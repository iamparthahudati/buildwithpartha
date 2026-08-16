import type { LucideIcon } from "lucide-react";

import type { IconSize } from "./scales";

import "./icon.css";

/**
 * The single wrapper around the approved icon set (lucide-react, ADR-013).
 *
 * Consumers import the specific Lucide icon and pass the component itself,
 * rather than naming it through a string map. A string map would force every
 * icon into the bundle; passing the component keeps tree-shaking working, so a
 * screen only ships the icons it actually renders.
 */

interface IconBaseProps {
  /** The Lucide component itself, e.g. `import { Calendar } from "lucide-react"`. */
  readonly icon: LucideIcon;
  readonly size?: IconSize;
  /**
   * Overrides the stroke width. The default already matches the LifeOS type
   * weight; set this only when an icon reads too heavy or light beside its text.
   */
  readonly strokeWidth?: number;
  readonly className?: string;
}

interface DecorativeIconProps extends IconBaseProps {
  /**
   * Decorative icons sit beside text that already carries the meaning. They are
   * hidden from assistive technology so the same thing is not announced twice.
   */
  readonly decorative: true;
  readonly label?: never;
}

interface LabelledIconProps extends IconBaseProps {
  readonly decorative?: false;
  /**
   * The accessible name, required when the icon itself carries the meaning.
   *
   * This is *not* the escape hatch for icon-only buttons: an icon-only control
   * puts its name on the control, and passes the icon as decorative. See
   * `IconButton` (LOS-0307).
   */
  readonly label: string;
}

export type IconProps = DecorativeIconProps | LabelledIconProps;

export function Icon({
  icon: LucideGlyph,
  size = "md",
  strokeWidth,
  className,
  ...rest
}: IconProps) {
  const classes = ["lifeos-icon", `lifeos-icon--${size}`, className].filter(Boolean).join(" ");

  // A labelled icon is exposed as an image with a name; a decorative one is
  // removed from the accessibility tree entirely.
  const accessibility = rest.decorative
    ? ({ "aria-hidden": true, focusable: false } as const)
    : ({ role: "img", "aria-label": rest.label } as const);

  return (
    <LucideGlyph
      className={classes}
      // The box comes from the size token in CSS. Passing "100%" stops the
      // library from stamping a fixed 24px width/height that would not scale
      // with the user's text size settings.
      size="100%"
      {...(strokeWidth === undefined ? {} : { strokeWidth })}
      {...accessibility}
    />
  );
}
