import { AppShellDemo } from "./LayoutDemos";

import type { CatalogEntry } from "./registry";

/* Layout-component entries (LOS-0603 onward). */

export const LAYOUT_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "app-shell",
    name: "AppShell",
    group: "Composed",
    summary:
      "Composes Sidebar (LOS-0601) and TopBar (LOS-0602) around the routed main content, with a skip link that works at every viewport, an error boundary around each route, an overlay root, and focus/live-region behavior on navigation. Mounted only inside the protected route subtree, under RequireAuth.",
    states: [
      {
        id: "app-shell-desktop",
        name: "Desktop composition",
        description:
          "Sidebar, TopBar and the routed main region together. Resize the stage below 768px to see the mobile menu trigger and drawer take over.",
        render: () => <AppShellDemo />,
      },
    ],
  },
]);
