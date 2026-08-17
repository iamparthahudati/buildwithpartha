import {
  AccountMenuDemo,
  BackLinkDemo,
  BreadcrumbsLongDemo,
  BreadcrumbsShortDemo,
  MenuDemo,
  MetricCardEmptyDemo,
  MetricCardErrorDemo,
  MetricCardLoadingDemo,
  MetricCardReadyDemo,
  PageHeaderDemo,
  TabsLocalDemo,
  TabsUrlDemo,
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
]);
