import { useId, type ElementType, type ReactNode } from "react";

import { Heading, type HeadingLevel } from "./Typography";
import "./surface.css";

/**
 * Surface (LOS-0329).
 *
 * The card primitive. It owns background, border, radius, elevation and
 * padding, and nothing else — no layout of its own, so a Today widget and a
 * project row can share it without inheriting each other's grid.
 *
 * `interactive` is styling only. Making the whole card a click target means
 * either a `div` with a click handler, which no keyboard reaches, or nesting
 * links and buttons inside a button, which is invalid. The supported pattern is
 * a real link or button inside the card whose focus ring the card follows —
 * `interactive` is what lights the card up when that control is hovered or
 * focused.
 */

export interface SurfaceProps {
  readonly children: ReactNode;
  /** `section` and `article` are landmarks; use them only with a title. */
  readonly as?: "div" | "section" | "article" | "li" | "aside";
  readonly tone?: "default" | "muted" | "raised";
  readonly bordered?: boolean;
  readonly padding?: "none" | "sm" | "md" | "lg";
  /**
   * A real heading at the top of the card. When the element is a `section`,
   * the heading also becomes the section's accessible name, which is what
   * makes it a useful landmark rather than an anonymous region.
   */
  readonly title?: string;
  readonly titleLevel?: HeadingLevel;
  /** Actions or a count shown opposite the title. */
  readonly titleAction?: ReactNode;
  /** Lights the card when the control inside it is hovered or focused. */
  readonly interactive?: boolean;
  readonly className?: string;
}

export function Surface({
  children,
  as = "div",
  tone = "default",
  bordered = true,
  padding = "md",
  title,
  titleLevel = 2,
  titleAction,
  interactive = false,
  className,
}: SurfaceProps) {
  const Element = as as ElementType;
  const titleId = useId();
  const isLandmark = as === "section" || as === "aside";

  return (
    <Element
      className={[
        "lifeos-surface",
        `lifeos-surface--${tone}`,
        `lifeos-surface--padding-${padding}`,
        bordered && "is-bordered",
        interactive && "is-interactive",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      // An unnamed region is worse than no region: it appears in the landmark
      // list with nothing to distinguish it from every other one.
      {...(isLandmark && title !== undefined ? { "aria-labelledby": titleId } : {})}
    >
      {title === undefined ? null : (
        <div className="lifeos-surface__header">
          <Heading level={titleLevel} size="sm" id={titleId}>
            {title}
          </Heading>
          {titleAction === undefined ? null : (
            <div className="lifeos-surface__header-action">{titleAction}</div>
          )}
        </div>
      )}

      {children}
    </Element>
  );
}
