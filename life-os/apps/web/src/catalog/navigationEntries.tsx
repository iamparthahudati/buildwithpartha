import {
  AccountMenuDemo,
  AttachmentDemo,
  AttachmentDisabledDemo,
  BackLinkDemo,
  BarChartDemo,
  BreadcrumbsLongDemo,
  BreadcrumbsShortDemo,
  ChartFrameEmptyDemo,
  ChartFrameErrorDemo,
  ChartFrameLoadingDemo,
  ChartFrameReadyDemo,
  ChartLegendDemo,
  DataTableDemo,
  DonutChartEmptyDemo,
  DonutChartReadyDemo,
  FilterBarDemo,
  LineChartDemo,
  MenuDemo,
  MetricCardEmptyDemo,
  MetricCardErrorDemo,
  MetricCardLoadingDemo,
  MetricCardReadyDemo,
  PageHeaderDemo,
  PaginationLocalDemo,
  PaginationUrlDemo,
  SortControlDemo,
  TableDemo,
  TabsLocalDemo,
  TabsUrlDemo,
  TimelineDemo,
  ViewToggleDemo,
} from "./NavigationDemos";

import type { CatalogEntry } from "./registry";

export const NAVIGATION_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "menu",
    name: "Menu",
    group: "Composed",
    summary:
      'The ARIA menu-button pattern on real DOM focus: arrow keys move a roving tabIndex between real <button role="menuitem"> elements, Home/End jump to the ends, typing jumps to (and, on repeat, cycles through) matches, and the popup flips above or to the trailing edge of its trigger when the viewport has no room the other way.',
    states: [
      {
        id: "menu-basic",
        name: "Actions with a separator and a destructive item",
        description: "Open it, then try arrow keys, Home/End, typing a letter, and Escape.",
        render: () => <MenuDemo />,
      },
    ],
  },
  {
    id: "account-menu",
    name: "AccountMenu",
    group: "Composed",
    summary:
      "Menu with a fixed identity header — an avatar, name and email above the items — so who is signed in never depends on remembering a settings page. Items stay caller-supplied: this component owns only the shape, never the account actions' copy.",
    states: [
      {
        id: "account-menu-basic",
        name: "Profile, settings and sign out",
        description: "Aligns to the trailing edge of the trigger by default, like a top-bar menu.",
        render: () => <AccountMenuDemo />,
      },
    ],
  },
  {
    id: "tabs",
    name: "Tabs",
    group: "Composed",
    summary:
      'The ARIA tabs pattern with automatic activation: arrow keys move a roving tabIndex between real <button role="tab"> elements and select as they go, matching Menu\'s own roving-focus mechanics. A panel mounts the first time its tab is selected and then stays mounted (hidden, not removed) — real lazy loading without losing local state on the next visit. Tabs is fully controlled, so "local" and "URL-synced" are the same component wired to different state.',
    states: [
      {
        id: "tabs-local",
        name: "Local state",
        description: "Selection lives in useState and resets on reload. Try the arrow keys.",
        render: () => <TabsLocalDemo />,
      },
      {
        id: "tabs-url",
        name: "URL-synced",
        description:
          "Backed by useDeepLinkParam (LOS-0414) instead — reload the page or use the browser's Back button and the selection stays correct.",
        render: () => <TabsUrlDemo />,
      },
    ],
  },
  {
    id: "breadcrumbs",
    name: "Breadcrumbs",
    group: "Composed",
    summary:
      'A real <nav aria-label="Breadcrumb"><ol> hierarchy. The last item is never a link — there is nothing to navigate to — and carries aria-current="page" instead. A trail longer than maxVisible collapses its middle behind a "Show N hidden breadcrumbs" button rather than losing it outright; each remaining crumb also truncates with an ellipsis on narrow viewports, automatic by breakpoint.',
    states: [
      {
        id: "breadcrumbs-short",
        name: "Fits without collapsing",
        description: "Three items, under the default maxVisible of 4.",
        render: () => <BreadcrumbsShortDemo />,
      },
      {
        id: "breadcrumbs-long",
        name: "Collapsed, with an expand control",
        description: "Five items over a maxVisible of 4 — the middle hides behind the button.",
        render: () => <BreadcrumbsLongDemo />,
      },
    ],
  },
  {
    id: "back-link",
    name: "BackLink",
    group: "Composed",
    summary:
      '"Back" only means the browser\'s own history when document.referrer proves the page was actually reached from elsewhere in this app; otherwise it renders as a real Link to a caller-supplied fallback instead of a history button that could do nothing or leave the app entirely.',
    states: [
      {
        id: "back-link-basic",
        name: "Renders per the catalog's own referrer",
        description:
          "This page's own document.referrer decides which form renders — reload via a direct URL to see the fallback Link instead of the history button.",
        render: () => <BackLinkDemo />,
      },
    ],
  },
  {
    id: "page-header",
    name: "PageHeader",
    group: "Composed",
    summary:
      "The banner at the top of a screen: an optional Breadcrumbs trail, the page's one real <h1>, an optional description and caller-supplied metadata, a primary action and — reusing Menu (LOS-0415) rather than a second dropdown — an overflow menu for everything secondary. The title row wraps to a stacked layout below the small breakpoint, automatic like every other composed component's \"responsive.\"",
    states: [
      {
        id: "page-header-full",
        name: "Every slot filled",
        description: "Resize the viewport narrower to see the actions drop below the title.",
        render: () => <PageHeaderDemo />,
      },
    ],
  },
  {
    id: "metric-card",
    name: "MetricCard",
    group: "Composed",
    summary:
      "A single number on Surface, built on the Metric typography atom (LOS-0305) rather than a heading — a number is a data point, not a document-outline entry. status is one discriminated prop (ready/loading/error/empty) so an impossible combination is a type error, not a runtime check. A trend is never color alone: a direction icon, the value's own visible text and a hidden increase/decrease/no-change word all back it.",
    states: [
      {
        id: "metric-card-ready",
        name: "Ready, with trend, period and action",
        description:
          "A falling count is good for Open tasks but a rising one is bad for Overdue tasks — isPositive, not direction alone, decides the trend's color.",
        render: () => <MetricCardReadyDemo />,
      },
      {
        id: "metric-card-loading",
        name: "Loading",
        description: "The label stays real visible text; only the value becomes a skeleton.",
        render: () => <MetricCardLoadingDemo />,
      },
      {
        id: "metric-card-error",
        name: "Error, with retry",
        description: "onRetry is optional — omitting it renders the message with no button.",
        render: () => <MetricCardErrorDemo />,
      },
      {
        id: "metric-card-empty",
        name: "Empty",
        description: 'Defaults to "No data yet"; a caller-supplied message overrides it.',
        render: () => <MetricCardEmptyDemo />,
      },
    ],
  },
  {
    id: "filter-bar",
    name: "FilterBar",
    group: "Composed",
    summary:
      "The shell around a screen's own filter controls — no domain filters of its own, matching DataTable's \"no domain columns hardcoded\" principle. Renders the caller's controls inline on a wide viewport and behind a single Filters button opening a Drawer (LOS-0414) below the small breakpoint, both reading the same controlled state. A separate, pure filterUrlContract (serializeFilters/parseFilters) defines how a filter set round-trips through a URL, independent of this component.",
    states: [
      {
        id: "filter-bar-basic",
        name: "Status and search, with chips and a count",
        description:
          "Pick a status or type a search term, then try Clear all. Resize narrower to see the Filters button and Drawer.",
        render: () => <FilterBarDemo />,
      },
    ],
  },
  {
    id: "pagination",
    name: "Pagination",
    group: "Composed",
    summary:
      'A real <nav> with real <button> page controls: the current page carries aria-current="page" and its own distinct style, and Previous/Next are genuinely disabled — not merely styled to look inert — at the real first/last page. A pure paginationRange function collapses a long run of pages behind an ellipsis on either side of the current page, always keeping the first and last page one click away. Like Tabs, page/onPageChange is a plain controlled pair, so "URL integration" is the caller\'s own choice of useState versus useDeepLinkParam (LOS-0414), not a feature this component adds.',
    states: [
      {
        id: "pagination-local",
        name: "Local state, 20 pages",
        description: "Enough pages to see the collapse. Resize narrower for the compact label.",
        render: () => <PaginationLocalDemo />,
      },
      {
        id: "pagination-url",
        name: "URL-synced",
        description:
          "Backed by useDeepLinkParam instead — reload the page or use the browser's Back button and the page stays correct.",
        render: () => <PaginationUrlDemo />,
      },
    ],
  },
  {
    id: "sort-control",
    name: "SortControl",
    group: "Composed",
    summary:
      'One trigger showing the current sort as a stable label ("Sort: Name, ascending"), reusing Menu (LOS-0415) for the field picker. Picking the already-selected field toggles its direction; picking a different one keeps the current direction, since nothing here can guess which is more natural for a caller\'s own field.',
    states: [
      {
        id: "sort-control-basic",
        name: "Toggle direction by reselecting the same field",
        description: "Open it, pick Name again to flip direction, or pick a different field.",
        render: () => <SortControlDemo />,
      },
    ],
  },
  {
    id: "view-toggle",
    name: "ViewToggle",
    group: "Composed",
    summary:
      'A real role="group" of real buttons, each carrying aria-pressed for the selected view — the ARIA toggle-button-group pattern, not a radiogroup, since a view preference is presentation rather than a set of mutually exclusive answers. The three modes (list/grid/table) are this design system\'s own fixed vocabulary, not caller-supplied domain data.',
    states: [
      {
        id: "view-toggle-basic",
        name: "List, grid and table",
        description: "The pressed button reflects the current selection.",
        render: () => <ViewToggleDemo />,
      },
    ],
  },
  {
    id: "table",
    name: "Table primitives",
    group: "Composed",
    summary:
      'Real <table>/<thead>/<tbody>/<tr>/<th>/<td> — never role="grid", which is a spreadsheet-editing contract nothing here needs. Tab reaches every real control (a selection Checkbox) in reading order; a screen reader\'s own table-navigation commands read scope/aria-sort for free. Selection cells reuse Checkbox (LOS-0311) with its visible label hidden only inside a select cell; DataTable (LOS-0424) is what will compose these with query state, filters, sorting and a domain-aware responsive card view.',
    states: [
      {
        id: "table-basic",
        name: "Selection, sort indicator, truncation and density",
        description:
          "The Description column truncates; the Name header shows an ascending sort indicator. Select rows or Select all.",
        render: () => <TableDemo />,
      },
    ],
  },
  {
    id: "data-table",
    name: "DataTable",
    group: "Composed",
    summary:
      "The Epic 04 composition, not a ninth primitive: FilterBar, SortControl, the Table primitives, Pagination, EmptyState and ErrorState wired together, fully controlled by the caller exactly like each already is on its own. Generic over the row type via columns/rows/getRowId, so no domain columns are hardcoded here. Column headers are not themselves clickable to sort — SortControl already owns that interaction — but do carry real aria-sort when named as the active field.",
    states: [
      {
        id: "data-table-basic",
        name: "Filters, sort, selection, bulk actions, pagination and a card view",
        description:
          "Filter by status, sort by a field, select rows for the bulk Delete action, or resize narrower to see the card view replace the table.",
        render: () => <DataTableDemo />,
      },
    ],
  },
  {
    id: "chart-frame",
    name: "ChartFrame and ChartLegend",
    group: "Composed",
    summary:
      "The chrome around any chart — title, summary, header actions, a ready/loading/empty/error contract (mirroring DataTable's own status shape) and the legend — built on Surface directly. ChartFrame draws no chart itself; that stays the caller's children (LOS-0429's own ticket). Giving dataTable adds a self-contained \"View as table\" toggle, the accessible alternative to a chart no screen reader can meaningfully read. ChartLegend reuses the eight frozen chart tokens ColorIconPicker already named, and becomes a real toggle button per item only when the caller supplies onToggle.",
    states: [
      {
        id: "chart-frame-ready",
        name: "Ready, with a legend, export action and table fallback",
        description:
          'Try "View as table" — it swaps the placeholder bars for a real, accessible table of the same data without losing the header or legend.',
        render: () => <ChartFrameReadyDemo />,
      },
      {
        id: "chart-frame-loading",
        name: "Loading",
        description:
          "A Skeleton reserves the chart's space; the waiting state is announced once, not silently.",
        render: () => <ChartFrameLoadingDemo />,
      },
      {
        id: "chart-frame-empty",
        name: "Empty",
        description: "Composes EmptyState with the caller's own title and description.",
        render: () => <ChartFrameEmptyDemo />,
      },
      {
        id: "chart-frame-error",
        name: "Error, with retry",
        description:
          'Composes ErrorState at scope="region" — the rest of the page stays usable around it.',
        render: () => <ChartFrameErrorDemo />,
      },
      {
        id: "chart-legend-toggle",
        name: "ChartLegend on its own, as an interactive series toggle",
        description:
          "Each item is a real toggle button here (onToggle given) — click one to hide/show it.",
        render: () => <ChartLegendDemo />,
      },
    ],
  },
  {
    id: "bar-line-donut-charts",
    name: "BarChart, LineChart and DonutChart",
    group: "Composed",
    summary:
      'Hand-rolled SVG, not a charting dependency (DEPENDENCY-POLICY.md treats a new package as its own reviewable ticket). All three share a 0–100 viewBox stretched with preserveAspectRatio="none" for responsiveness with no resize observer, a roving tabIndex across data points that also moves real DOM focus (Menu\'s own mechanics), and a percentage-positioned ChartTooltip. Bar/Line always include a zero baseline and render a negative value below/against it; Donut clamps a negative value to zero (an area cannot be negative) and falls back to a plain track-colored ring when every value is zero.',
    states: [
      {
        id: "bar-chart-basic",
        name: "BarChart, with a zero, a negative and a large value",
        description:
          "Tab to the first bar, then use ArrowLeft/ArrowRight, Home and End — the tooltip and each bar's spoken value follow real keyboard focus, not just a visual highlight.",
        render: () => <BarChartDemo />,
      },
      {
        id: "line-chart-basic",
        name: "LineChart, same data as a trend",
        description: "The same net-tasks series as a line against a dashed zero reference.",
        render: () => <LineChartDemo />,
      },
      {
        id: "donut-chart-basic",
        name: "DonutChart, tasks by status",
        description:
          "Each slice's tooltip and accessible label carry both its value and its share of the total.",
        render: () => <DonutChartReadyDemo />,
      },
      {
        id: "donut-chart-empty",
        name: "DonutChart, every value zero",
        description:
          "Falls back to a plain track-colored ring — ProgressRing's own is-empty treatment — rather than an invisible chart.",
        render: () => <DonutChartEmptyDemo />,
      },
    ],
  },
  {
    id: "timeline",
    name: "Timeline",
    group: "Composed",
    summary:
      "A vertical sequence of dated milestones. status (completed/current/future/overdue) is entirely the caller's — whether a future-dated entry has quietly become overdue depends on \"now\" and a timezone, which only the caller holding both can resolve. Composing DividerList (LOS-0330) directly was considered and rejected: its horizontal hairline-between-rows separator fights a timeline's own vertical connecting line through each marker, so this uses a plain <ol> with its own marker/line CSS instead. Titles stay plain text by default (EmptyState's own titleLevel convention) rather than assuming every milestone deserves a real heading in the page's outline.",
    states: [
      {
        id: "timeline-basic",
        name: "Completed, current, overdue and future milestones",
        description:
          "The current entry's marker pulses gently (disabled under reduced motion); the overdue one is styled distinctly from a plain future entry despite both being un-completed.",
        render: () => <TimelineDemo />,
      },
    ],
  },
  {
    id: "attachment",
    name: "AttachmentUploader / AttachmentList",
    group: "Composed",
    summary:
      "A feature-flagged picker plus the list of what it's picked, following the Files capability's own scan-before-availability lifecycle end to end: uploading (cancellable) → scanning → ready (authorized download/delete) or blocked (failed the scan, never downloadable), with failed (an incomplete upload) retryable. onDownload/onDelete gate whether their own controls render at all rather than rendering them disabled — authorization is the backend's decision, never a hidden frontend control's. Delete reuses ConfirmDialog (LOS-0413) internally, naming the exact file being removed, and closes itself once the caller's own successful delete removes the row from the list.",
    states: [
      {
        id: "attachment-lifecycle",
        name: "Full lifecycle: ready, blocked, failed, plus a live upload",
        description:
          "Add a file to watch it move through a real uploading → scanning → ready sequence; retry the dropped upload; delete goes through a named confirmation before a real pending delay removes the row.",
        render: () => <AttachmentDemo />,
      },
      {
        id: "attachment-disabled",
        name: "Files capability off",
        description:
          "docs/31-PRIVACY-DATA-LIFECYCLE.md's own P4 \"optional high-risk\" gate: no picker renders at all, only the tone guide's exact explanation.",
        render: () => <AttachmentDisabledDemo />,
      },
    ],
  },
]);
