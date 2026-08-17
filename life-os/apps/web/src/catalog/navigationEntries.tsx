import { AccountMenuDemo, MenuDemo, TabsLocalDemo, TabsUrlDemo } from "./NavigationDemos";

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
]);
