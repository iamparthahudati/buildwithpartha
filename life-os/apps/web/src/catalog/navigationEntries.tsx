import {
  AccountMenuDemo,
  BackLinkDemo,
  BreadcrumbsLongDemo,
  BreadcrumbsShortDemo,
  FilterBarDemo,
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
]);
