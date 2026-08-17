import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Pencil, Trash2, Users } from "lucide-react";

import {
  AccountMenu,
  BackLink,
  Breadcrumbs,
  FilterBar,
  Menu,
  MetricCard,
  PageHeader,
  Pagination,
  SortControl,
  Tabs,
  ViewToggle,
  type ActiveFilterChip,
  type BreadcrumbItem,
  type MenuItemDescriptor,
  type SortOption,
  type SortState,
  type TabItem,
  type ViewMode,
} from "@components/navigation";
import { Badge, Button, CountBadge, Link, Select, Text, TextInput } from "@components/ui";
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

const SHORT_TRAIL: readonly BreadcrumbItem[] = [
  { label: "Home", href: "#home" },
  { label: "Projects", href: "#projects" },
  { label: "Website refresh", href: "#projects/website-refresh" },
];

const LONG_TRAIL: readonly BreadcrumbItem[] = [
  { label: "Home", href: "#home" },
  { label: "Projects", href: "#projects" },
  { label: "Website refresh", href: "#projects/website-refresh" },
  { label: "Tasks", href: "#projects/website-refresh/tasks" },
  {
    label: "Fix header on the marketing landing page",
    href: "#projects/website-refresh/tasks/fix-header",
  },
];

export function BreadcrumbsShortDemo() {
  return <Breadcrumbs items={SHORT_TRAIL} />;
}

export function BreadcrumbsLongDemo() {
  return <Breadcrumbs items={LONG_TRAIL} maxVisible={4} />;
}

export function BackLinkDemo() {
  return <BackLink fallbackHref="#" />;
}

const PAGE_HEADER_BREADCRUMBS: readonly BreadcrumbItem[] = [
  { label: "Home", href: "#home" },
  { label: "Projects", href: "#projects" },
  { label: "Website refresh", href: "#projects/website-refresh" },
];

const PAGE_HEADER_SECONDARY_ACTIONS: readonly MenuItemDescriptor[] = [
  { type: "item", id: "duplicate", label: "Duplicate project", onSelect: () => {} },
  { type: "item", id: "export", label: "Export data", onSelect: () => {} },
  { type: "separator", id: "sep-1" },
  { type: "item", id: "archive", label: "Archive project", destructive: true, onSelect: () => {} },
];

export function PageHeaderDemo() {
  return (
    <PageHeader
      title="Website refresh"
      description="Every task related to the marketing site relaunch."
      breadcrumbs={PAGE_HEADER_BREADCRUMBS}
      metadata={<Badge tone="success">Active</Badge>}
      primaryAction={<Button>Add task</Button>}
      secondaryActions={PAGE_HEADER_SECONDARY_ACTIONS}
    />
  );
}

export function MetricCardReadyDemo() {
  return (
    <div className="specimen-row">
      <MetricCard
        icon={CheckCircle2}
        label="Open tasks"
        status={{ type: "ready", value: "42" }}
        period="vs last 7 days"
        trend={{ direction: "down", value: "8%", isPositive: true }}
        action={<Link href="#tasks">View all</Link>}
      />
      <MetricCard
        icon={AlertTriangle}
        label="Overdue tasks"
        status={{ type: "ready", value: "5" }}
        period="vs last 7 days"
        trend={{ direction: "up", value: "3", isPositive: false }}
      />
      <MetricCard
        icon={Users}
        label="Active members"
        status={{ type: "ready", value: "18" }}
        trend={{ direction: "flat", value: "0%", isPositive: true }}
      />
    </div>
  );
}

export function MetricCardLoadingDemo() {
  return <MetricCard icon={CheckCircle2} label="Open tasks" status={{ type: "loading" }} />;
}

export function MetricCardErrorDemo() {
  return (
    <MetricCard
      icon={CheckCircle2}
      label="Open tasks"
      status={{ type: "error", message: "Couldn't load this metric.", onRetry: () => {} }}
    />
  );
}

export function MetricCardEmptyDemo() {
  return <MetricCard icon={CheckCircle2} label="Open tasks" status={{ type: "empty" }} />;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In progress" },
  { value: "done", label: "Done" },
];

const STATUS_LABEL: Readonly<Record<string, string>> = Object.freeze({
  open: "Open",
  "in-progress": "In progress",
  done: "Done",
});

export function FilterBarDemo() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");

  const chips: ActiveFilterChip[] = [];
  if (status) {
    chips.push({
      id: "status",
      label: `Status: ${STATUS_LABEL[status]}`,
      onRemove: () => setStatus(""),
    });
  }
  if (search) {
    chips.push({ id: "search", label: `Search: "${search}"`, onRemove: () => setSearch("") });
  }

  return (
    <FilterBar
      activeChips={chips}
      resultCount="12 tasks"
      onClearAll={() => {
        setStatus("");
        setSearch("");
      }}
    >
      <Select
        label="Status"
        options={STATUS_OPTIONS}
        placeholder="Any status"
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      />
      <TextInput
        label="Search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
    </FilterBar>
  );
}

export function PaginationLocalDemo() {
  const [page, setPage] = useState(1);
  return (
    <Pagination
      page={page}
      pageSize={10}
      total={200}
      onPageChange={setPage}
      label="Tasks pagination"
    />
  );
}

export function PaginationUrlDemo() {
  const { value, open } = useDeepLinkParam("catalog-page");
  const page = value ? Number(value) : 1;
  return (
    <Pagination
      page={page}
      pageSize={10}
      total={50}
      onPageChange={(nextPage) => open(String(nextPage))}
      label="Tasks pagination (URL-synced)"
    />
  );
}

const SORT_OPTIONS: readonly SortOption[] = [
  { id: "name", label: "Name" },
  { id: "created", label: "Date created" },
  { id: "due", label: "Due date" },
];

export function SortControlDemo() {
  const [sort, setSort] = useState<SortState>({ optionId: "name", direction: "asc" });
  return (
    <SortControl options={SORT_OPTIONS} value={sort} onChange={setSort} label="Sort tasks by" />
  );
}

export function ViewToggleDemo() {
  const [mode, setMode] = useState<ViewMode>("list");
  return <ViewToggle value={mode} onChange={setMode} label="Task list view" />;
}
