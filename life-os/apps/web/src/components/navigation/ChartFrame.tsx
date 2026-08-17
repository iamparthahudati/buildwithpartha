import { useState, type CSSProperties, type ReactNode } from "react";

import { EmptyState, ErrorState, type EmptyStateVariant } from "@components/feedback";
import { Button, LiveRegion, Skeleton, Surface, Text } from "@components/ui";

import { ChartLegend, type ChartLegendItem } from "./ChartLegend";
import "./chart-frame.css";

/**
 * ChartFrame (LOS-0428).
 *
 * The chrome around any chart — title, summary, header actions, a
 * loading/empty/error contract and the legend — built on `Surface`
 * (LOS-0329) directly rather than reimplementing its title/landmark
 * wiring: `title`/`titleAction` here are passed straight through to
 * `Surface`'s own props, the same header a `section` needs to be a useful
 * landmark rather than an anonymous region.
 *
 * `status` mirrors `DataTable`'s own `"ready" | "loading" | ..."` shape
 * (LOS-0424): loading reserves `minHeight` with a `Skeleton` rather than
 * collapsing the card, empty composes `EmptyState` (LOS-0410), and error
 * composes `ErrorState` (LOS-0411) at `scope="region"` — the tone guide's
 * "partial failure" rule, since the rest of the page around a failed chart
 * stays usable. This component draws nothing itself; the actual chart is
 * always the caller's `children` (`LOS-0429`'s wrappers, or anything else).
 *
 * The "data-table fallback contract" is a self-contained toggle: giving
 * `dataTable` adds a "View as table" control that swaps the chart for that
 * accessible alternative. The toggle is uncontrolled — unlike `Tabs`'
 * `selectedId`, there is no deep-link/cross-component sync case yet to
 * justify a controlled `viewMode`/`onViewModeChange` pair, so this stays a
 * single internal boolean until a real caller needs otherwise.
 */

export type ChartFrameStatus = "ready" | "loading" | "empty" | "error";

export interface ChartFrameProps {
  readonly title: string;
  readonly summary?: string;
  readonly status: ChartFrameStatus;
  readonly loadingLabel?: string;
  readonly emptyVariant?: EmptyStateVariant;
  readonly emptyTitle?: string;
  readonly emptyDescription?: string;
  readonly errorTitle?: string;
  readonly errorDescription?: string;
  readonly onRetry?: () => void;
  /** A period selector, an export button, or both — entirely the caller's. */
  readonly actions?: ReactNode;
  readonly legend?: readonly ChartLegendItem[];
  /** An accessible table alternative. Given, enables the chart/table toggle. */
  readonly dataTable?: ReactNode;
  readonly tableViewLabel?: string;
  readonly chartViewLabel?: string;
  /** Reserves space for `loading` and keeps every status the same rough height. */
  readonly minHeight?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

export function ChartFrame({
  title,
  summary,
  status,
  loadingLabel = "Loading chart…",
  emptyVariant = "filtered",
  emptyTitle = "No data for this period",
  emptyDescription,
  errorTitle = "Couldn't load this chart",
  errorDescription,
  onRetry,
  actions,
  legend,
  dataTable,
  tableViewLabel = "View as table",
  chartViewLabel = "View as chart",
  minHeight = "16rem",
  children,
  className,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);

  const toggleButton = dataTable ? (
    <Button variant="secondary" size="sm" onClick={() => setShowTable((current) => !current)}>
      {showTable ? chartViewLabel : tableViewLabel}
    </Button>
  ) : null;

  const headerActions =
    toggleButton || actions ? (
      <div className="lifeos-chart-frame__actions">
        {toggleButton}
        {actions}
      </div>
    ) : undefined;

  return (
    <Surface
      as="section"
      title={title}
      titleAction={headerActions}
      padding="md"
      className={["lifeos-chart-frame", className].filter(Boolean).join(" ")}
    >
      {summary ? (
        <Text tone="secondary" size="sm" className="lifeos-chart-frame__summary">
          {summary}
        </Text>
      ) : null}

      <div className="lifeos-chart-frame__body" style={{ minHeight } as CSSProperties}>
        {status === "loading" ? (
          <>
            {/* Skeleton is aria-hidden by design (LOS-0324's own doc comment);
                the waiting state is announced here, once, by this region's
                own status text — not by the silent placeholder shapes. */}
            <LiveRegion message={loadingLabel} />
            <Skeleton shape="block" height={minHeight} className="lifeos-chart-frame__skeleton" />
          </>
        ) : status === "empty" ? (
          <EmptyState
            variant={emptyVariant}
            title={emptyTitle}
            {...(emptyDescription ? { description: emptyDescription } : {})}
          />
        ) : status === "error" ? (
          <ErrorState
            scope="region"
            title={errorTitle}
            {...(errorDescription ? { description: errorDescription } : {})}
            {...(onRetry ? { onRetry } : {})}
          />
        ) : showTable && dataTable ? (
          dataTable
        ) : (
          children
        )}
      </div>

      {status === "ready" && !showTable && legend && legend.length > 0 ? (
        <ChartLegend
          items={legend}
          label={`${title} legend`}
          className="lifeos-chart-frame__legend"
        />
      ) : null}
    </Surface>
  );
}
