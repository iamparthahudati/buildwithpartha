import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Icon, Link, VisuallyHidden } from "@components/ui";

import { collapseBreadcrumbs, type BreadcrumbItem } from "./breadcrumbsCollapse";
import "./breadcrumbs.css";

/**
 * Breadcrumbs (LOS-0417).
 *
 * `<nav aria-label="Breadcrumb"><ol>…` per the ARIA breadcrumb pattern — an
 * ordered list, because the trail is a real hierarchy, not an arbitrary set
 * of links. The last item is the current page: never a link (there is
 * nothing to navigate to), rendered as plain text with `aria-current="page"`
 * so it is announced, not only styled.
 *
 * Truncation is collapse-then-expand, not collapse-and-lose: once the trail
 * is longer than `maxVisible`, the middle items sit behind a single button
 * ("Show N hidden breadcrumbs") that reveals the full trail on activation,
 * rather than a dead ellipsis with no way back to the hidden path. Each
 * crumb's own label also truncates with an ellipsis via CSS on narrow
 * viewports — automatic by breakpoint, the same "responsive" this design
 * system's other components already use, not a size a caller picks.
 */

export interface BreadcrumbsProps {
  /** The hierarchy from root to current page. The last item is never a link. */
  readonly items: readonly BreadcrumbItem[];
  /** Collapses the middle of the trail once it exceeds this many items. */
  readonly maxVisible?: number;
  readonly className?: string;
}

const DEFAULT_MAX_VISIBLE = 4;

export function Breadcrumbs({
  items,
  maxVisible = DEFAULT_MAX_VISIBLE,
  className,
}: BreadcrumbsProps) {
  const [expanded, setExpanded] = useState(false);

  const entries = collapseBreadcrumbs(items, expanded ? items.length : maxVisible);

  return (
    <nav
      aria-label="Breadcrumb"
      className={["lifeos-breadcrumbs", className].filter(Boolean).join(" ")}
    >
      <ol className="lifeos-breadcrumbs__list">
        {entries.map((entry, index) => {
          if (entry.type === "ellipsis") {
            return (
              <li key={`ellipsis-${index}`} className="lifeos-breadcrumbs__item">
                <button
                  type="button"
                  className="lifeos-breadcrumbs__ellipsis"
                  onClick={() => setExpanded(true)}
                >
                  <Icon icon={MoreHorizontal} decorative size="sm" />
                  <VisuallyHidden>
                    Show {entry.hiddenItems.length} hidden breadcrumb
                    {entry.hiddenItems.length === 1 ? "" : "s"}
                  </VisuallyHidden>
                </button>
                <span aria-hidden="true" className="lifeos-breadcrumbs__separator">
                  /
                </span>
              </li>
            );
          }

          return (
            <li key={`${index}-${entry.item.href}`} className="lifeos-breadcrumbs__item">
              {entry.isCurrent ? (
                <span aria-current="page" className="lifeos-breadcrumbs__current">
                  {entry.item.label}
                </span>
              ) : (
                <>
                  <Link href={entry.item.href} quiet className="lifeos-breadcrumbs__link">
                    {entry.item.label}
                  </Link>
                  <span aria-hidden="true" className="lifeos-breadcrumbs__separator">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
