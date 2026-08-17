import type { ReactNode } from "react";
import { Minus, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";

import { InlineMessage } from "@components/feedback";
import { Button, Icon, Metric, Skeleton, Surface, Text, VisuallyHidden } from "@components/ui";
import "./metric-card.css";

/**
 * MetricCard (LOS-0419).
 *
 * A single at-a-glance number on `Surface` (LOS-0329), built on `Metric`
 * (LOS-0305) rather than a heading — a raw number is a data point, not a
 * document-outline entry, and `Metric` already gives it tabular numerals and
 * a real, visible, selectable label instead of an `aria-label`.
 *
 * `status` is one discriminated prop rather than separate
 * `loading`/`error`/`value` props, the same shape `Combobox`'s
 * single/multiple split and `MenuItemDescriptor`'s item/separator split
 * already use — it rules out the impossible combinations (a value shown
 * while also loading, an error with no message) as a type error instead of
 * a runtime check. Because `Metric`'s own `value` prop accepts any
 * `ReactNode`, that slot is what actually varies across states — the label
 * beside it stays real, visible text throughout, including while loading.
 *
 * A trend is never color alone: the direction icon (`TrendingUp` /
 * `TrendingDown` / `Minus`) and the value's own text are both always
 * visible, and a hidden word ("increase" / "decrease" / "no change") backs
 * them for anyone who cannot perceive icon shape or color at all.
 */

export type MetricTrendDirection = "up" | "down" | "flat";

export interface MetricTrend {
  readonly direction: MetricTrendDirection;
  /** Caller-formatted, e.g. "12%" — never invented here. */
  readonly value: string;
  /** Whether this direction is good news for this specific metric. */
  readonly isPositive: boolean;
}

export type MetricCardStatus =
  | { readonly type: "ready"; readonly value: string }
  | { readonly type: "loading" }
  | { readonly type: "error"; readonly message: string; readonly onRetry?: () => void }
  | { readonly type: "empty"; readonly message?: string };

export interface MetricCardProps {
  readonly icon?: LucideIcon;
  readonly label: string;
  readonly status: MetricCardStatus;
  /** e.g. "vs last 7 days" — shown only once the value is ready. */
  readonly period?: string;
  /** Only rendered alongside a `"ready"` status. */
  readonly trend?: MetricTrend;
  /** Typically a `Link`, e.g. "View all" — rendered as-is. */
  readonly action?: ReactNode;
  readonly className?: string;
}

const TREND_ICON: Record<MetricTrendDirection, LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const TREND_WORD: Record<MetricTrendDirection, string> = {
  up: "increase",
  down: "decrease",
  flat: "no change",
};

function trendSentimentClass(trend: MetricTrend): string {
  if (trend.direction === "flat") {
    return "neutral";
  }
  return trend.isPositive ? "positive" : "negative";
}

function valueSlot(status: MetricCardStatus): ReactNode {
  switch (status.type) {
    case "ready":
      return status.value;
    case "loading":
      return <Skeleton shape="block" width="4rem" height="1em" />;
    case "error":
      return <InlineMessage tone="danger">{status.message}</InlineMessage>;
    case "empty":
      return status.message ?? "No data yet";
  }
}

export function MetricCard({
  icon,
  label,
  status,
  period,
  trend,
  action,
  className,
}: MetricCardProps) {
  return (
    <Surface className={["lifeos-metric-card", className].filter(Boolean).join(" ")} padding="md">
      {icon ? <Icon icon={icon} decorative size="md" className="lifeos-metric-card__icon" /> : null}

      <Metric value={valueSlot(status)} size="lg" className="lifeos-metric-card__metric">
        {label}
      </Metric>

      {status.type === "ready" && trend ? (
        <span
          className={`lifeos-metric-card__trend lifeos-metric-card__trend--${trendSentimentClass(trend)}`}
        >
          <Icon icon={TREND_ICON[trend.direction]} decorative size="sm" />
          {trend.value}
          <VisuallyHidden> {TREND_WORD[trend.direction]}</VisuallyHidden>
        </span>
      ) : null}

      {status.type === "ready" && period ? (
        <Text tone="muted" size="xs" className="lifeos-metric-card__period">
          {period}
        </Text>
      ) : null}

      {status.type === "error" && status.onRetry ? (
        <Button size="sm" variant="secondary" onClick={status.onRetry}>
          Try again
        </Button>
      ) : null}

      {action ? <div className="lifeos-metric-card__action">{action}</div> : null}
    </Surface>
  );
}
