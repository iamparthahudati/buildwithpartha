import { use, type ElementType, type ReactNode } from "react";

import { DividerListElementContext } from "./dividerListContext";
import "./divider-list.css";

/**
 * DividerList (LOS-0330).
 *
 * Rows separated by a hairline: a task list, a day's Time Blocks, a settings
 * group. The separators are drawn with a border on each row after the first,
 * so there is no separator element between rows — a `<ul>` whose children
 * alternate between `<li>` and a decorative `<div>` is invalid, and assistive
 * technology reports the item count wrongly.
 *
 * The list is a real `<ul>` by default, because "how many are there" is a
 * question a screen-reader user asks constantly and the list role answers it
 * for free. `as="div"` is for a group of unrelated rows that is not a list —
 * a settings panel, say — where claiming a count would be a small lie.
 */

export interface DividerListProps {
  readonly children: ReactNode;
  readonly as?: "ul" | "ol" | "div";
  /** Names the list, e.g. "Today's tasks". Required for `ul` and `ol`. */
  readonly label?: string;
  /** `sm` for dense rows; `md` matches the density row height. */
  readonly density?: "sm" | "md";
  readonly className?: string;
}

export function DividerList({
  children,
  as = "ul",
  label,
  density = "md",
  className,
}: DividerListProps) {
  const Element = as as ElementType;
  const rowElement = as === "div" ? "div" : "li";

  return (
    <DividerListElementContext value={rowElement}>
      <Element
        className={[
          "lifeos-divider-list",
          `lifeos-divider-list--${density}`,
          as === "div" && "lifeos-divider-list--plain",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...(label === undefined ? {} : { "aria-label": label })}
        {...(as === "div" ? { role: "group" } : {})}
      >
        {children}
      </Element>
    </DividerListElementContext>
  );
}

export interface DividerListItemProps {
  readonly children: ReactNode;
  /** Lights the row when the control inside it is hovered or focused. */
  readonly interactive?: boolean;
  readonly className?: string;
}

export function DividerListItem({
  children,
  interactive = false,
  className,
}: DividerListItemProps) {
  // Follows whatever list it is inside, so a row cannot become an orphan `li`.
  const Element = use(DividerListElementContext) as ElementType;

  return (
    <Element
      className={["lifeos-divider-list__row", interactive && "is-interactive", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Element>
  );
}
