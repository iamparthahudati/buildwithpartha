import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";

import { Heading, IconButton, Text } from "@components/ui";

import { Breadcrumbs } from "./Breadcrumbs";
import type { BreadcrumbItem } from "./breadcrumbsCollapse";
import { Menu, type MenuItemDescriptor } from "./Menu";
import "./page-header.css";

/**
 * PageHeader (LOS-0418).
 *
 * The banner at the top of a screen: an optional breadcrumb trail above the
 * title, then a row splitting the title block (heading, description,
 * caller-supplied metadata) from the actions — a primary action plus an
 * overflow menu for the rest, reusing `Menu` (LOS-0415) rather than
 * inventing a second dropdown pattern. "Split" describes that layout split,
 * not a split-button widget: a primary action next to a menu for everything
 * secondary is the shape almost every real page header actually needs, and
 * it stays one composition instead of two unrelated action lists.
 *
 * `title` is always the document's `<h1>` — a page header owns exactly one,
 * which is what makes `level` unnecessary as a prop here (contrast
 * `Heading`, LOS-0305, whose whole point is that level and size vary
 * independently for every other heading in the app).
 *
 * The title row wraps to a stacked layout once it cannot fit both the title
 * block and the actions on one line — automatic by breakpoint, the same
 * "responsive" every other composed component in this design system uses,
 * not a prop a caller sets.
 */

export interface PageHeaderProps {
  readonly title: string;
  readonly description?: string;
  readonly breadcrumbs?: readonly BreadcrumbItem[];
  /** e.g. a status badge or a StatusDot row — caller-supplied, never invented here. */
  readonly metadata?: ReactNode;
  /** Typically a `Button` — rendered as-is, this component adds no behavior to it. */
  readonly primaryAction?: ReactNode;
  /** Overflow actions, shown behind a single "More actions" menu next to the primary action. */
  readonly secondaryActions?: readonly MenuItemDescriptor[];
  readonly className?: string;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  metadata,
  primaryAction,
  secondaryActions,
  className,
}: PageHeaderProps) {
  const hasActions = primaryAction !== undefined || (secondaryActions?.length ?? 0) > 0;

  return (
    <header className={["lifeos-page-header", className].filter(Boolean).join(" ")}>
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <Breadcrumbs items={breadcrumbs} className="lifeos-page-header__breadcrumbs" />
      ) : null}

      <div className="lifeos-page-header__row">
        <div className="lifeos-page-header__titleblock">
          <Heading level={1}>{title}</Heading>
          {description ? (
            <Text tone="secondary" className="lifeos-page-header__description">
              {description}
            </Text>
          ) : null}
          {metadata ? <div className="lifeos-page-header__metadata">{metadata}</div> : null}
        </div>

        {hasActions ? (
          <div className="lifeos-page-header__actions">
            {primaryAction}
            {secondaryActions && secondaryActions.length > 0 ? (
              <Menu
                trigger={
                  <IconButton icon={MoreHorizontal} label="More actions" variant="secondary" />
                }
                items={secondaryActions}
                label="More actions"
                align="end"
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
