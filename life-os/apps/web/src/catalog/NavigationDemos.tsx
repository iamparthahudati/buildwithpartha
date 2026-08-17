import { useState } from "react";
import { AlertTriangle, CheckCircle2, Copy, Pencil, Trash2, Users } from "lucide-react";

import {
  AccountMenu,
  BackLink,
  Breadcrumbs,
  DataTable,
  FilterBar,
  Menu,
  MetricCard,
  PageHeader,
  Pagination,
  SortControl,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableSelectAllCell,
  TableSelectCell,
  Tabs,
  ViewToggle,
  type ActiveFilterChip,
  type BreadcrumbItem,
  type DataTableColumn,
  type MenuItemDescriptor,
  type SortOption,
  type SortState,
  type TabItem,
  type ViewMode,
} from "@components/navigation";
import { Badge, Button, CountBadge, Link, Select, Surface, Text, TextInput } from "@components/ui";
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

interface DemoTask {
  readonly id: string;
  readonly name: string;
  readonly status: string;
  readonly description: string;
}

const DEMO_TASKS: readonly DemoTask[] = [
  {
    id: "1",
    name: "Fix header on the marketing landing page",
    status: "Open",
    description: "The logo overlaps the nav on narrow viewports below 480px.",
  },
  {
    id: "2",
    name: "Ship release",
    status: "In progress",
    description: "Tag v2.4.0 once the last two blockers close.",
  },
  {
    id: "3",
    name: "Write release notes",
    status: "Done",
    description: "Summarize the changelog for the newsletter.",
  },
];

export function TableDemo() {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  function toggleRow(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelected(next);
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(DEMO_TASKS.map((task) => task.id)) : new Set());
  }

  const allSelected = selected.size === DEMO_TASKS.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <Table caption="Tasks">
      <TableHead>
        <TableRow>
          <TableSelectAllCell
            checked={allSelected}
            indeterminate={someSelected}
            onChange={toggleAll}
          />
          <TableHeaderCell sortDirection="ascending">Name</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Description</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {DEMO_TASKS.map((task) => (
          <TableRow key={task.id} selected={selected.has(task.id)}>
            <TableSelectCell
              checked={selected.has(task.id)}
              onChange={(checked) => toggleRow(task.id, checked)}
              label={`Select ${task.name}`}
            />
            <TableCell>{task.name}</TableCell>
            <TableCell>{task.status}</TableCell>
            <TableCell truncate>{task.description}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const DATA_TABLE_COLUMNS: readonly DataTableColumn<DemoTask>[] = [
  { key: "name", header: "Name", render: (task) => task.name, truncate: true },
  { key: "status", header: "Status", render: (task) => task.status },
];

export function DataTableDemo() {
  const [status, setStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [sort, setSort] = useState<SortState>({ optionId: "name", direction: "asc" });
  const [page, setPage] = useState(1);

  const visibleTasks = status ? DEMO_TASKS.filter((task) => task.status === status) : DEMO_TASKS;

  const chips: ActiveFilterChip[] = status
    ? [{ id: "status", label: `Status: ${status}`, onRemove: () => setStatus("") }]
    : [];

  return (
    <DataTable
      label="Tasks"
      columns={DATA_TABLE_COLUMNS}
      rows={visibleTasks}
      getRowId={(task) => task.id}
      getRowLabel={(task) => task.name}
      emptyTitle="No tasks match this filter"
      emptyDescription="Try clearing the status filter."
      filters={{
        controls: (
          <Select
            label="Status"
            labelHidden
            placeholder="Any status"
            options={[
              { value: "Open", label: "Open" },
              { value: "In progress", label: "In progress" },
              { value: "Done", label: "Done" },
            ]}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          />
        ),
        activeChips: chips,
        onClearAll: () => setStatus(""),
        resultCount: `${visibleTasks.length} tasks`,
      }}
      sort={{
        options: [
          { id: "name", label: "Name" },
          { id: "status", label: "Status" },
        ],
        value: sort,
        onChange: setSort,
      }}
      pagination={{ page, pageSize: 10, total: visibleTasks.length, onPageChange: setPage }}
      selection={{
        selectedIds,
        onSelectedIdsChange: setSelectedIds,
        bulkActions: (
          <Button variant="danger" size="sm">
            Delete
          </Button>
        ),
      }}
      renderCard={(task) => (
        <Surface padding="sm">
          <Text weight="semibold">{task.name}</Text>
          <Text tone="secondary" size="sm">
            {task.status}
          </Text>
        </Surface>
      )}
    />
  );
}
