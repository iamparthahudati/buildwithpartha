import type { ReactNode } from "react";
import { Archive, Inbox, ListFilter, Lock, Search, type LucideIcon } from "lucide-react";

import { Heading, Icon, Surface, Text, type HeadingLevel } from "@components/ui";

import "./empty-state.css";

/**
 * EmptyState (LOS-0410).
 *
 * A pure layout primitive: `variant` picks a sensible default icon and
 * nothing else. Copy is always the caller's — `title`/`description` are
 * plain required/optional strings, never derived from `variant` — the same
 * "components accept semantic content, never invent feature copy
 * internally" rule the tone guide's component copy contract states, and the
 * same reason the tone guide's own module examples table gives Projects,
 * Time Blocks, Notes and every other first-use empty state its own wording
 * rather than one shared sentence.
 *
 * The five variants come from the ticket, not the tone guide's own
 * empty-state table one for one: `first-use`, `filtered` and `search` match
 * directly; `permission` matches the tone guide's separate
 * "Permission/unavailable" row (`This item isn't available.`); `archived` has
 * no dedicated row but follows the same voice the guide's Archive example and
 * module-examples table already establish.
 */

export type EmptyStateVariant = "first-use" | "filtered" | "search" | "permission" | "archived";

const VARIANT_ICONS: Readonly<Record<EmptyStateVariant, LucideIcon>> = Object.freeze({
  "first-use": Inbox,
  filtered: ListFilter,
  search: Search,
  permission: Lock,
  archived: Archive,
});

export interface EmptyStateProps {
  readonly variant: EmptyStateVariant;
  readonly title: string;
  readonly description?: string;
  /**
   * Renders `title` as a real heading at this level, joining the page's own
   * outline — appropriate for a full-page or full-section empty state.
   * Omitted, the title stays plain emphasized text: a "No results" inside a
   * dropdown or a small filtered list is not a landmark in the page's
   * outline, and forcing it into one would be a false structural claim.
   */
  readonly titleLevel?: HeadingLevel;
  /**
   * Overrides the variant's default icon. `false` renders no icon at all —
   * there is no illustration system in LifeOS yet (`Logo`, LOS-0328, made the
   * same honest scoping call), so this slot is icon-only for now, not a
   * generic illustration slot in name only.
   */
  readonly icon?: LucideIcon | false;
  /** At most one — typically a `Button`. */
  readonly primaryAction?: ReactNode;
  /** At most one — typically a secondary `Button` or a `Link`. */
  readonly secondaryAction?: ReactNode;
  readonly className?: string;
}

export function EmptyState({
  variant,
  title,
  titleLevel,
  description,
  icon,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateProps) {
  const resolvedIcon = icon === undefined ? VARIANT_ICONS[variant] : icon;

  return (
    <Surface
      tone="muted"
      bordered={false}
      padding="lg"
      className={["lifeos-empty-state", className].filter(Boolean).join(" ")}
    >
      {resolvedIcon ? (
        <Icon icon={resolvedIcon} decorative className="lifeos-empty-state__icon" />
      ) : null}

      {titleLevel === undefined ? (
        <p className="lifeos-empty-state__title lifeos-empty-state__title--plain">{title}</p>
      ) : (
        <Heading level={titleLevel} size="sm" className="lifeos-empty-state__title">
          {title}
        </Heading>
      )}

      {description ? (
        <Text tone="secondary" size="sm" className="lifeos-empty-state__description">
          {description}
        </Text>
      ) : null}

      {primaryAction || secondaryAction ? (
        <div className="lifeos-empty-state__actions">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </Surface>
  );
}
