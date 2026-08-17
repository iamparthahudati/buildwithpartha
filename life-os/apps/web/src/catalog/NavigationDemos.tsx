import { Copy, Pencil, Trash2 } from "lucide-react";

import { AccountMenu, Menu, type MenuItemDescriptor } from "@components/navigation";
import { Button } from "@components/ui";

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
