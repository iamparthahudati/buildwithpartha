import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";

import {
  AccountMenu,
  Menu,
  Tabs,
  type MenuItemDescriptor,
  type TabItem,
} from "@components/navigation";
import { Button, CountBadge, Text } from "@components/ui";
import { useDeepLinkParam } from "@hooks/useDeepLinkParam";

/**
 * Interactive demos for the navigation catalog entries. Live apart from the
 * entry registry so that file exports only data and this one only
 * components, which keeps React Fast Refresh working.
 */

const PROJECT_MENU_ITEMS: readonly MenuItemDescriptor[] = [
  { type: "item", id: "rename", label: "Rename", icon: Pencil, onSelect: () => {} },
  { type: "item", id: "duplicate", label: "Duplicate", icon: Copy, onSelect: () => {} },
  { type: "separator", id: "sep-1" },
  {
    type: "item",
    id: "delete",
    label: "Delete project",
    icon: Trash2,
    destructive: true,
    onSelect: () => {},
  },
];

export function MenuDemo() {
  return (
    <Menu
      trigger={<Button variant="secondary">Project actions</Button>}
      items={PROJECT_MENU_ITEMS}
      label="Project actions"
    />
  );
}

const ACCOUNT_MENU_ITEMS: readonly MenuItemDescriptor[] = [
  { type: "item", id: "profile", label: "View profile", onSelect: () => {} },
  { type: "item", id: "settings", label: "Settings", onSelect: () => {} },
  { type: "separator", id: "sep-1" },
  { type: "item", id: "sign-out", label: "Sign out", destructive: true, onSelect: () => {} },
];

export function AccountMenuDemo() {
  return <AccountMenu name="Ada Lovelace" email="ada@lifeos.app" items={ACCOUNT_MENU_ITEMS} />;
}

/**
 * Records the moment it first mounted and never updates again — proof, in
 * the running catalog rather than only in a test, that switching away from a
 * tab and back does not remount its panel and lose whatever it was doing.
 */
function MountedOnceNote({ panelName }: { readonly panelName: string }) {
  const [mountedAt] = useState(() => new Date().toLocaleTimeString());
  return (
    <Text tone="secondary" size="sm">
      {panelName} first mounted at {mountedAt} — switch tabs and back; this time never changes.
    </Text>
  );
}

function tabItems(): readonly TabItem[] {
  return [
    { id: "overview", label: "Overview", panel: <MountedOnceNote panelName="Overview" /> },
    {
      id: "activity",
      label: "Activity",
      badge: <CountBadge count={5} label="unread activity items" />,
      panel: <MountedOnceNote panelName="Activity" />,
    },
    {
      id: "settings",
      label: "Settings",
      disabled: true,
      panel: <MountedOnceNote panelName="Settings" />,
    },
  ];
}

export function TabsLocalDemo() {
  const [selectedId, setSelectedId] = useState("overview");
  return (
    <Tabs
      items={tabItems()}
      selectedId={selectedId}
      onSelectedIdChange={setSelectedId}
      label="Project views (local)"
    />
  );
}

export function TabsUrlDemo() {
  const { value, open } = useDeepLinkParam("catalog-tab");
  const selectedId = value ?? "overview";
  return (
    <Tabs
      items={tabItems()}
      selectedId={selectedId}
      onSelectedIdChange={open}
      label="Project views (URL-synced)"
    />
  );
}
