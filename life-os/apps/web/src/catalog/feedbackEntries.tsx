import {
  Divider,
  ProgressBar,
  ProgressRing,
  Skeleton,
  SkeletonCard,
  SkeletonTable,
  SkeletonText,
  Spinner,
} from "@components/ui";

import type { CatalogEntry } from "./registry";

/* Progress and waiting entries (LOS-0321 to LOS-0325). */

export const FEEDBACK_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "progress-bar",
    name: "ProgressBar",
    group: "Atoms",
    summary:
      "A real measurement or nothing. The value text names what is being counted, because a bare percentage names neither its metric nor its base.",
    states: [
      {
        id: "progress-bar-values",
        name: "Values",
        description:
          "Empty, partial and complete. Rounding never reads as 0% while work has started, or 100% while it has not finished.",
        render: () => (
          <div className="specimen-stack">
            <ProgressBar
              label="Sprint commitment"
              value={0}
              max={8}
              valueText="0 of 8 tasks done"
            />
            <ProgressBar
              label="Sprint commitment"
              value={3}
              max={8}
              valueText="3 of 8 tasks done"
              showValue
            />
            <ProgressBar
              label="Sprint commitment"
              value={8}
              max={8}
              tone="success"
              valueText="8 of 8 tasks done"
              showValue
            />
            <ProgressBar
              label="Almost, but not quite"
              value={996}
              max={1000}
              showValue
              tone="warning"
            />
          </div>
        ),
      },
      {
        id: "progress-bar-indeterminate",
        name: "Indeterminate",
        description:
          "For work whose end is genuinely unknown. It reports no value, which is what says the value is unknown rather than zero.",
        render: () => <ProgressBar label="Preparing your export" indeterminate />,
      },
      {
        id: "progress-bar-sizes",
        name: "Sizes and tones",
        description: "Three heights; a tone is for a crossed threshold, never decoration.",
        render: () => (
          <div className="specimen-stack">
            <ProgressBar label="Small" size="sm" value={40} />
            <ProgressBar label="Medium" size="md" value={40} />
            <ProgressBar label="Large" size="lg" value={40} tone="danger" />
          </div>
        ),
      },
    ],
  },
  {
    id: "progress-ring",
    name: "ProgressRing",
    group: "Atoms",
    summary:
      "The same reading as ProgressBar, drawn as a dial. One conic gradient driven by one custom property — no SVG geometry to recompute.",
    states: [
      {
        id: "progress-ring-values",
        name: "Values",
        description: "Zero shows no arc at all; full closes without a seam.",
        render: () => (
          <div className="specimen-row">
            <ProgressRing label="Habits" value={0} max={8} valueText="0 of 8 habits" />
            <ProgressRing label="Habits" value={3} max={8} valueText="3 of 8 habits" />
            <ProgressRing
              label="Habits"
              value={8}
              max={8}
              tone="success"
              valueText="8 of 8 habits"
            />
          </div>
        ),
      },
      {
        id: "progress-ring-sizes",
        name: "Size and thickness",
        description: "Named steps, all in rem, so a ring scales with the user's text settings.",
        render: () => (
          <div className="specimen-row">
            <ProgressRing label="Small" size="sm" thickness="thin" value={62} />
            <ProgressRing label="Medium" size="md" value={62} />
            <ProgressRing label="Large" size="lg" thickness="thick" value={62} />
          </div>
        ),
      },
    ],
  },
  {
    id: "spinner",
    name: "Spinner",
    group: "Atoms",
    summary:
      "Says that something is happening and nothing else. A waiting region still needs real copy, and a waiting list is better served by Skeleton.",
    states: [
      {
        id: "spinner-sizes",
        name: "Sizes",
        description: "Sized in em, so the disc matches whatever text it sits beside.",
        render: () => (
          <div className="specimen-row">
            <Spinner label="Loading tasks…" size="sm" />
            <Spinner label="Loading tasks…" size="md" />
            <Spinner label="Loading tasks…" size="lg" />
          </div>
        ),
      },
      {
        id: "spinner-labelled",
        name: "With visible copy",
        description: "The label is hidden by default; show it when nothing else says what is late.",
        render: () => <Spinner label="Saving changes…" labelVisible />,
      },
    ],
  },
  {
    id: "skeleton",
    name: "Skeleton",
    group: "Atoms",
    summary:
      "Reserves the space the content will take, so nothing reflows under the pointer when the data arrives. Every shape is hidden from assistive technology.",
    states: [
      {
        id: "skeleton-shapes",
        name: "Shapes",
        description: "Line, block and circle, each accepting any CSS length.",
        render: () => (
          <div className="specimen-stack">
            <Skeleton shape="line" width="18rem" />
            <Skeleton shape="block" width="18rem" />
            <Skeleton shape="circle" width="3rem" />
          </div>
        ),
      },
      {
        id: "skeleton-compositions",
        name: "Text, card and table",
        description: "A paragraph ends on a short line, as a real one usually does.",
        render: () => (
          <div className="specimen-stack">
            <SkeletonText lines={3} />
            <SkeletonCard withMedia lines={2} />
            <SkeletonTable rows={3} columns={4} />
          </div>
        ),
      },
    ],
  },
  {
    id: "divider",
    name: "Divider",
    group: "Atoms",
    summary:
      "Silent by default. Most rules repeat a grouping that headings and list structure already carry, so announcing every one of them is noise.",
    states: [
      {
        id: "divider-orientations",
        name: "Orientations",
        description: "Horizontal and vertical, decorative unless the line carries the structure.",
        render: () => (
          <div className="specimen-stack">
            <Divider />
            <div className="specimen-row">
              <span>Deep work</span>
              <Divider orientation="vertical" spacing="sm" />
              <span>Reading</span>
              <Divider orientation="vertical" spacing="sm" />
              <span>Weekly planning</span>
            </div>
          </div>
        ),
      },
      {
        id: "divider-labelled",
        name: "Labelled break",
        description: "For a boundary the line alone would not explain.",
        render: () => <Divider label="Earlier" />,
      },
    ],
  },
]);
