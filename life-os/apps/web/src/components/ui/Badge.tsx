import type { LucideIcon } from "lucide-react";

import { Icon } from "./Icon";
import type { BadgeTone } from "./scales";
import "./badge.css";
import "./visually-hidden.css";

/**
 * Badge and StatusDot (LOS-0309).
 *
 * Every badge renders text. Color is an accompaniment, never the carrier of
 * meaning — a red dot alone is invisible to anyone who cannot distinguish it,
 * and to anyone using a screen reader.
 */

interface BadgeProps {
  readonly children: React.ReactNode;
  readonly tone?: BadgeTone;
  /** Adds a leading dot. Purely supporting; the text still carries meaning. */
  readonly dot?: boolean;
  /** A decorative leading icon. The label still names the badge. */
  readonly icon?: LucideIcon;
  readonly className?: string;
}

export function Badge({ children, tone = "neutral", dot = false, icon, className }: BadgeProps) {
  const classes = ["lifeos-badge", `lifeos-badge--${tone}`, className].filter(Boolean).join(" ");

  return (
    <span className={classes}>
      {dot ? <span className="lifeos-badge__dot" aria-hidden="true" /> : null}
      {icon ? <Icon icon={icon} decorative size="sm" /> : null}
      {children}
    </span>
  );
}

interface StatusDotProps {
  readonly tone?: BadgeTone;
  /**
   * The dot's meaning in words. Required, because a dot on its own conveys
   * nothing to assistive technology. When visible text beside the dot already
   * says the same thing, pass `decorative` instead.
   */
  readonly label: string;
  readonly className?: string;
}

/** A standalone status dot, announced by its label. */
export function StatusDot({ tone = "neutral", label, className }: StatusDotProps) {
  const classes = ["lifeos-status-dot", `lifeos-status-dot--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} role="img" aria-label={label}>
      <span className="lifeos-status-dot__mark" aria-hidden="true" />
    </span>
  );
}

interface DecorativeStatusDotProps {
  readonly tone?: BadgeTone;
  readonly className?: string;
}

/**
 * A dot beside text that already states the status. Hidden from assistive
 * technology so the status is not announced twice.
 */
export function DecorativeStatusDot({ tone = "neutral", className }: DecorativeStatusDotProps) {
  const classes = ["lifeos-status-dot", `lifeos-status-dot--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} aria-hidden="true">
      <span className="lifeos-status-dot__mark" />
    </span>
  );
}

interface CountBadgeProps {
  readonly count: number;
  /**
   * Names what is being counted, e.g. "unread notifications". Required so the
   * number is never announced as a bare digit.
   */
  readonly label: string;
  /** Values above this render as "99+" so the badge cannot stretch a layout. */
  readonly max?: number;
  readonly tone?: BadgeTone;
  readonly className?: string;
}

export function CountBadge({
  count,
  label,
  max = 99,
  tone = "primary",
  className,
}: CountBadgeProps) {
  const clamped = count > max;
  const display = clamped ? `${max}+` : String(count);
  const classes = ["lifeos-badge", "lifeos-badge--count", `lifeos-badge--${tone}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {/* The exact count is spoken even when the visible text is clamped. */}
      <span aria-hidden="true">{display}</span>
      <span className="lifeos-visually-hidden">{`${count} ${label}`}</span>
    </span>
  );
}
