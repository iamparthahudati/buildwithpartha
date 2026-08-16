import "./divider.css";
import "./visually-hidden.css";

/**
 * Divider (LOS-0325).
 *
 * Most rules on a page are decoration: the grouping they suggest is already
 * carried by headings, landmarks and list structure, so announcing "separator"
 * on every one of them adds noise without adding meaning. A divider is
 * therefore silent by default, and takes a role only when the line is the only
 * thing marking a boundary — a labelled break in a feed, say, where "Earlier"
 * is genuinely new information.
 */

export interface DividerProps {
  readonly orientation?: "horizontal" | "vertical";
  /**
   * Adds the separator role. Set it when the line itself carries the
   * structure, not when it is drawn between things that are already grouped.
   */
  readonly semantic?: boolean;
  /** Text sitting in the break, e.g. "Earlier". Implies a semantic divider. */
  readonly label?: string;
  readonly spacing?: "none" | "sm" | "md" | "lg";
  readonly className?: string;
}

export function Divider({
  orientation = "horizontal",
  semantic = false,
  label,
  spacing = "md",
  className,
}: DividerProps) {
  const classes = [
    "lifeos-divider",
    `lifeos-divider--${orientation}`,
    `lifeos-divider--spacing-${spacing}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (label !== undefined) {
    return (
      // `separator` takes its name from aria-label rather than its content, so
      // the visible text is hidden from assistive technology to avoid saying
      // the same word twice.
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={label}
        className={`${classes} lifeos-divider--labelled`}
      >
        <span className="lifeos-divider__rule" />
        <span className="lifeos-divider__label" aria-hidden="true">
          {label}
        </span>
        <span className="lifeos-divider__rule" />
      </div>
    );
  }

  if (!semantic) {
    // No role at all: a decorative rule that announces itself is noise.
    return <div aria-hidden="true" className={classes} />;
  }

  if (orientation === "vertical") {
    // `<hr>` is horizontal by definition, so a vertical separator has to say so.
    return <div role="separator" aria-orientation="vertical" className={classes} />;
  }

  // `<hr>` already carries the separator role; adding one would be redundant.
  return <hr className={classes} />;
}
