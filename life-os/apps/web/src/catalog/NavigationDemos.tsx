import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthSessionProvider } from "@state/AuthSessionProvider";
import { FocusMiniPlayer } from "@features/focus";
import {
  TodayHeader,
  TodayMetricStrip,
  TodayHeaderSection,
  TodaySchedule,
  type TodayScheduleBlockModel,
} from "@features/today";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Copy,
  MessageSquare,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import {
  AccountMenu,
  ActivityFeed,
  AttachmentList,
  AttachmentUploader,
  BackLink,
  BarChart,
  Breadcrumbs,
  ChartFrame,
  ChartLegend,
  CommentComposer,
  CommentList,
  DataTable,
  DonutChart,
  FilterBar,
  LineChart,
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
  Timeline,
  ViewToggle,
  Sidebar,
  TopBar,
  type ActiveFilterChip,
  type ActivityEvent,
  type Attachment,
  type BreadcrumbItem,
  type ChartDatum,
  type ChartLegendItem,
  type Comment,
  type DataTableColumn,
  type MenuItemDescriptor,
  type SortOption,
  type SortState,
  type TabItem,
  type TimelineEntry,
  type ViewMode,
} from "@components/navigation";
import {
  Badge,
  Button,
  CountBadge,
  Link,
  Select,
  StatusDot,
  Surface,
  Text,
  TextInput,
} from "@components/ui";
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

interface TaskStatusDatum {
  readonly id: string;
  readonly label: string;
  readonly colorName: ChartLegendItem["colorName"];
  readonly count: number;
}

const TASK_STATUS_DATA: readonly TaskStatusDatum[] = [
  { id: "todo", label: "To do", colorName: "blue", count: 12 },
  { id: "in-progress", label: "In progress", colorName: "amber", count: 5 },
  { id: "done", label: "Done", colorName: "green", count: 8 },
];

export function ChartFrameReadyDemo() {
  const legend: readonly ChartLegendItem[] = TASK_STATUS_DATA.map((datum) => ({
    id: datum.id,
    label: datum.label,
    colorName: datum.colorName,
    value: String(datum.count),
  }));
  const chartData: readonly ChartDatum[] = TASK_STATUS_DATA.map((datum) => ({
    id: datum.id,
    label: datum.label,
    value: datum.count,
    colorName: datum.colorName,
  }));

  return (
    <ChartFrame
      title="Tasks by status"
      summary="Most open work is still in To do."
      status="ready"
      legend={legend}
      actions={<Button variant="secondary">Export CSV</Button>}
      dataTable={
        <Table aria-label="Tasks by status, as a table">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Count</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {TASK_STATUS_DATA.map((datum) => (
              <TableRow key={datum.id}>
                <TableCell>{datum.label}</TableCell>
                <TableCell>{datum.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    >
      <BarChart data={chartData} label="Tasks by status" locale="en-US" />
    </ChartFrame>
  );
}

export function ChartFrameLoadingDemo() {
  return (
    <ChartFrame title="Tasks by status" status="loading">
      <div />
    </ChartFrame>
  );
}

export function ChartFrameEmptyDemo() {
  return (
    <ChartFrame
      title="Tasks by status"
      status="empty"
      emptyTitle="No tasks in this range"
      emptyDescription="Try a wider date range."
    >
      <div />
    </ChartFrame>
  );
}

export function ChartFrameErrorDemo() {
  return (
    <ChartFrame
      title="Tasks by status"
      status="error"
      errorTitle="Couldn't load this chart"
      errorDescription="Your other widgets are unaffected."
      onRetry={() => {}}
    >
      <div />
    </ChartFrame>
  );
}

export function ChartLegendDemo() {
  const [active, setActive] = useState<Record<string, boolean>>({
    todo: true,
    "in-progress": true,
    done: true,
  });

  const items: readonly ChartLegendItem[] = TASK_STATUS_DATA.map((datum) => ({
    id: datum.id,
    label: datum.label,
    colorName: datum.colorName,
    value: String(datum.count),
    active: active[datum.id] ?? true,
    onToggle: () =>
      setActive((current) => ({ ...current, [datum.id]: !(current[datum.id] ?? true) })),
  }));

  return <ChartLegend items={items} label="Tasks by status" />;
}

const NET_TASKS_DATA: readonly ChartDatum[] = [
  { id: "mon", label: "Mon", value: 4 },
  { id: "tue", label: "Tue", value: 0 },
  { id: "wed", label: "Wed", value: -3 },
  { id: "thu", label: "Thu", value: 1 },
  { id: "fri", label: "Fri", value: 12450 },
];

export function BarChartDemo() {
  return (
    <BarChart data={NET_TASKS_DATA} label="Net tasks completed vs. added, by day" locale="en-US" />
  );
}

export function LineChartDemo() {
  return (
    <LineChart data={NET_TASKS_DATA} label="Net tasks completed vs. added, by day" locale="en-US" />
  );
}

export function DonutChartReadyDemo() {
  const data: readonly ChartDatum[] = TASK_STATUS_DATA.map((datum) => ({
    id: datum.id,
    label: datum.label,
    value: datum.count,
    colorName: datum.colorName,
  }));

  return <DonutChart data={data} label="Tasks by status" locale="en-US" />;
}

export function DonutChartEmptyDemo() {
  const data: readonly ChartDatum[] = [
    { id: "todo", label: "To do", value: 0 },
    { id: "done", label: "Done", value: 0 },
  ];

  return <DonutChart data={data} label="Tasks by status" locale="en-US" />;
}

const TIMELINE_ENTRIES: readonly TimelineEntry[] = [
  {
    id: "kickoff",
    title: "Kickoff",
    description: "Project charter approved and the team assembled.",
    date: "2026-01-05",
    status: "completed",
  },
  {
    id: "design-review",
    title: "Design review",
    description: "Walking the marketing team through the new homepage.",
    date: "2026-08-20",
    status: "current",
  },
  {
    id: "content-freeze",
    title: "Content freeze",
    description: "All copy was due before the design review — still outstanding.",
    date: "2026-08-10",
    status: "overdue",
  },
  {
    id: "launch",
    title: "Launch",
    date: "2026-09-15",
    status: "future",
  },
];

export function TimelineDemo() {
  return <Timeline entries={TIMELINE_ENTRIES} label="Website refresh milestones" locale="en-US" />;
}

const ATTACHMENT_ACCEPTED_TYPES = ["application/pdf", "image/png"];

const INITIAL_ATTACHMENTS: readonly Attachment[] = [
  { id: "contract", fileName: "Signed contract.pdf", fileSizeBytes: 482_133, status: "ready" },
  { id: "quarantined", fileName: "invoice-scan.pdf", fileSizeBytes: 190_442, status: "blocked" },
  {
    id: "dropped",
    fileName: "Meeting notes.docx",
    fileSizeBytes: 12_400,
    status: "failed",
    error: "The connection dropped before the upload finished.",
  },
];

function nextAttachmentId() {
  return `attachment-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Owns a real, ticking uploading → scanning → ready sequence for anything
 * added through the picker, and a real pending delay before a delete
 * actually removes a row — the same "the demo owns the async simulation,
 * the component only ever renders what it's told" split `TimerRing`'s own
 * catalog demo already established for its countdown.
 */
export function AttachmentDemo() {
  const [attachments, setAttachments] = useState<readonly Attachment[]>(INITIAL_ATTACHMENTS);
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    const hasInFlightAttachment = attachments.some(
      (attachment) => attachment.status === "uploading" || attachment.status === "scanning",
    );
    if (!hasInFlightAttachment) {
      return;
    }
    const id = setTimeout(() => {
      setAttachments((current) =>
        current.map((attachment) => {
          if (attachment.status === "uploading") {
            const next = (attachment.uploadProgress ?? 0) + 20;
            // `uploadProgress` is only ever read while `status` is
            // "uploading", so the stale value left behind here is inert.
            return next >= 100
              ? { ...attachment, status: "scanning" }
              : { ...attachment, uploadProgress: next };
          }
          if (attachment.status === "scanning") {
            return { ...attachment, status: "ready" };
          }
          return attachment;
        }),
      );
    }, 500);
    return () => clearTimeout(id);
  }, [attachments]);

  return (
    <div className="specimen-stack">
      <AttachmentUploader
        acceptedTypes={ATTACHMENT_ACCEPTED_TYPES}
        acceptedTypesLabel="PDF or PNG"
        maxFileSizeBytes={5 * 1024 * 1024}
        locale="en-US"
        onFilesSelected={(files) => {
          setAttachments((current) => [
            ...current,
            ...files.map((file) => ({
              id: nextAttachmentId(),
              fileName: file.name,
              fileSizeBytes: file.size,
              status: "uploading" as const,
              uploadProgress: 0,
            })),
          ]);
        }}
      />

      <AttachmentList
        label="Project attachments"
        attachments={attachments}
        locale="en-US"
        emptyTitle="No attachments yet"
        emptyDescription="Add a file to attach it to this project."
        onCancel={(id) =>
          setAttachments((current) => current.filter((attachment) => attachment.id !== id))
        }
        onRetry={(id) =>
          setAttachments((current) =>
            current.map((attachment) =>
              // The stale `error` is left in place rather than cleared: it's
              // only ever read while `status` is "failed", which this
              // transition just left.
              attachment.id === id
                ? { ...attachment, status: "uploading", uploadProgress: 0 }
                : attachment,
            ),
          )
        }
        onDownload={() => {}}
        onDelete={(id) => {
          setDeletePending(true);
          setTimeout(() => {
            setAttachments((current) => current.filter((attachment) => attachment.id !== id));
            setDeletePending(false);
          }, 600);
        }}
        deletePending={deletePending}
      />
    </div>
  );
}

export function AttachmentDisabledDemo() {
  return (
    <AttachmentUploader
      acceptedTypes={ATTACHMENT_ACCEPTED_TYPES}
      acceptedTypesLabel="PDF or PNG"
      maxFileSizeBytes={5 * 1024 * 1024}
      locale="en-US"
      enabled={false}
      onFilesSelected={() => {}}
    />
  );
}

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Anchored to real "now" rather than a fixed date, so the catalog always
// shows sensible past relative times ("2 hours ago") no matter when someone
// actually opens it.
function createInitialComments(): readonly Comment[] {
  return [
    {
      id: "c1",
      authorName: "Ada Lovelace",
      body: "Looks good to me — the empty state copy is a lot clearer now.",
      createdAt: hoursAgo(6),
    },
    {
      id: "c2",
      authorName: "Grace Hopper",
      body: "One nit: the header still wraps oddly at 320px.\nCan you check the breadcrumbs row too?",
      createdAt: hoursAgo(3),
      editedAt: hoursAgo(2.5),
    },
  ];
}

function nextCommentId() {
  return `comment-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Owns a real pending delay for add/edit/delete, the same "the demo owns
 * the async simulation" split `TimerRing`'s and `AttachmentDemo`'s own
 * catalog demos already establish for their own real-feeling delays.
 */
export function CommentDemo() {
  const [comments, setComments] = useState<readonly Comment[]>(createInitialComments);
  const [draft, setDraft] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  return (
    <div className="specimen-stack">
      <CommentComposer
        value={draft}
        onChange={setDraft}
        pending={addPending}
        onSubmit={() => {
          setAddPending(true);
          setTimeout(() => {
            setComments((current) => [
              ...current,
              {
                id: nextCommentId(),
                authorName: "You",
                body: draft,
                createdAt: new Date().toISOString(),
              },
            ]);
            setDraft("");
            setAddPending(false);
          }, 500);
        }}
      />

      <CommentList
        label="Task comments"
        comments={comments}
        locale="en-US"
        timeZone="UTC"
        emptyTitle="No comments yet"
        emptyDescription="Add a comment when you have feedback to leave."
        editPending={editPending}
        onEdit={(id, body) => {
          setEditPending(true);
          setTimeout(() => {
            setComments((current) =>
              current.map((comment) =>
                comment.id === id
                  ? { ...comment, body, editedAt: new Date().toISOString() }
                  : comment,
              ),
            );
            setEditPending(false);
          }, 500);
        }}
        deletePending={deletePending}
        onDelete={(id) => {
          setDeletePending(true);
          setTimeout(() => {
            setComments((current) => current.filter((comment) => comment.id !== id));
            setDeletePending(false);
          }, 500);
        }}
      />
    </div>
  );
}

export function CommentEmptyDemo() {
  return (
    <CommentList
      label="Task comments"
      comments={[]}
      locale="en-US"
      timeZone="UTC"
      emptyTitle="No comments yet"
      emptyDescription="Add a comment when you have feedback to leave."
    />
  );
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

// Anchored to real "now" the same way AttachmentDemo/CommentDemo's own
// fixtures are, so Today/Yesterday grouping is always correct whenever the
// catalog is actually opened.
function createActivityEvents(): readonly ActivityEvent[] {
  return [
    {
      id: "a1",
      actorName: "Ada Lovelace",
      action: "marked done",
      object: { label: "Fix header on the marketing landing page", href: "#" },
      createdAt: hoursAgoIso(1),
      icon: CheckCircle2,
    },
    {
      id: "a2",
      actorName: "Grace Hopper",
      action: "commented on",
      object: { label: "Website refresh", href: "#" },
      createdAt: hoursAgoIso(3),
      icon: MessageSquare,
    },
    {
      id: "a3",
      actorName: "Ada Lovelace",
      // No `object`: this Task was deleted by someone else after the
      // comment, so the safe fallback renders in place of a broken link.
      action: "commented on",
      createdAt: hoursAgoIso(5),
      icon: MessageSquare,
    },
    {
      id: "a4",
      actorName: "Grace Hopper",
      action: "archived",
      object: { label: "Q1 planning", href: "#" },
      createdAt: hoursAgoIso(27),
      icon: Archive,
    },
    {
      id: "a5",
      actorName: "Ada Lovelace",
      action: "created",
      object: { label: "Onboarding checklist", href: "#" },
      createdAt: hoursAgoIso(30),
      icon: Plus,
    },
  ];
}

export function ActivityFeedDemo() {
  const [events] = useState<readonly ActivityEvent[]>(createActivityEvents);
  const [page, setPage] = useState(1);
  const pageSize = 3;
  const paged = events.slice((page - 1) * pageSize, page * pageSize);

  return (
    <ActivityFeed
      label="Project activity"
      events={paged}
      locale="en-US"
      timeZone="UTC"
      emptyTitle="No activity yet"
      emptyDescription="Actions taken on this project will show up here."
      pagination={{ page, pageSize, total: events.length, onPageChange: setPage }}
    />
  );
}

export function ActivityFeedLoadingDemo() {
  return (
    <ActivityFeed
      label="Project activity"
      events={[]}
      locale="en-US"
      timeZone="UTC"
      emptyTitle="No activity yet"
      status={{ type: "loading" }}
    />
  );
}

export function ActivityFeedErrorDemo() {
  return (
    <ActivityFeed
      label="Project activity"
      events={[]}
      locale="en-US"
      timeZone="UTC"
      emptyTitle="No activity yet"
      status={{ type: "error", message: "Project activity couldn't load.", onRetry: () => {} }}
    />
  );
}

export function SidebarExpandedDemo() {
  const [currentPath, setCurrentPath] = useState("/life-os/app/today");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "28rem",
        border: "1px solid var(--lifeos-color-border)",
        borderRadius: "var(--lifeos-radius-lg)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        currentPath={currentPath}
        collapsed={false}
        onNavigate={(href, e) => {
          e.preventDefault();
          setCurrentPath(href);
        }}
      />
      <div
        style={{
          flex: 1,
          padding: "var(--lifeos-space-6)",
          background: "var(--lifeos-color-canvas)",
        }}
      >
        <Text weight="medium">Active destination: {currentPath}</Text>
        <Text tone="secondary" size="sm">
          Click any sidebar item to test active-state navigation.
        </Text>
      </div>
    </div>
  );
}

export function SidebarCollapsedDemo() {
  const [currentPath, setCurrentPath] = useState("/life-os/app/tasks");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "28rem",
        border: "1px solid var(--lifeos-color-border)",
        borderRadius: "var(--lifeos-radius-lg)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        currentPath={currentPath}
        collapsed={true}
        onNavigate={(href, e) => {
          e.preventDefault();
          setCurrentPath(href);
        }}
      />
      <div
        style={{
          flex: 1,
          padding: "var(--lifeos-space-6)",
          background: "var(--lifeos-color-canvas)",
        }}
      >
        <Text weight="medium">Compact rail mode (collapsed)</Text>
        <Text tone="secondary" size="sm">
          Hover or focus the icon buttons to see destination tooltips.
        </Text>
      </div>
    </div>
  );
}

export function SidebarInteractiveDemo() {
  const [currentPath, setCurrentPath] = useState("/life-os/app/today");

  return (
    <div
      style={{
        display: "flex",
        minHeight: "28rem",
        border: "1px solid var(--lifeos-color-border)",
        borderRadius: "var(--lifeos-radius-lg)",
        overflow: "hidden",
      }}
    >
      <Sidebar
        currentPath={currentPath}
        onNavigate={(href, e) => {
          e.preventDefault();
          setCurrentPath(href);
        }}
      />
      <div
        style={{
          flex: 1,
          padding: "var(--lifeos-space-6)",
          background: "var(--lifeos-color-canvas)",
        }}
      >
        <Text weight="medium">Interactive Sidebar with Remembered Collapse Preference</Text>
        <Text tone="secondary" size="sm">
          Toggle collapse with the header chevron button or click any destination.
        </Text>
      </div>
    </div>
  );
}

export function SidebarDrawerDemo() {
  const [open, setOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState("/life-os/app/today");

  return (
    <div>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open navigation drawer
      </Button>
      <div style={{ marginTop: "var(--lifeos-space-2)" }}>
        <Text tone="secondary" size="sm">
          Current destination: {currentPath}
        </Text>
      </div>
      <Sidebar
        drawer={true}
        drawerOpen={open}
        onDrawerClose={() => setOpen(false)}
        currentPath={currentPath}
        onNavigate={(href, e) => {
          e.preventDefault();
          setCurrentPath(href);
          setOpen(false);
        }}
      />
    </div>
  );
}

const TOPBAR_ACCOUNT_ITEMS: readonly MenuItemDescriptor[] = [
  { type: "item", id: "profile", label: "View profile", onSelect: () => {} },
  { type: "item", id: "settings", label: "Settings", onSelect: () => {} },
  { type: "separator", id: "sep-1" },
  { type: "item", id: "sign-out", label: "Sign out", destructive: true, onSelect: () => {} },
];

const TOPBAR_ACCOUNT = {
  name: "Priya Sharma",
  email: "priya@example.com",
  items: TOPBAR_ACCOUNT_ITEMS,
};

const TOPBAR_STAGE_STYLE = {
  border: "1px solid var(--lifeos-color-border)",
  borderRadius: "var(--lifeos-radius-lg)",
} as const;

export function TopBarDemo() {
  const [log, setLog] = useState<string | null>(null);

  return (
    <div style={TOPBAR_STAGE_STYLE}>
      <TopBar
        contextLabel="Today"
        timeZone="Asia/Kolkata"
        locale="en-US"
        onSearchTriggerClick={() => setLog("Search trigger clicked (or Cmd/Ctrl+K anywhere)")}
        onQuickAddTriggerClick={() => setLog("Quick Add trigger clicked")}
        onNotificationsTriggerClick={() => setLog("Notifications trigger clicked")}
        account={TOPBAR_ACCOUNT}
      />
      <div style={{ padding: "var(--lifeos-space-4)" }}>
        <Text tone="secondary" size="sm">
          {log ?? "Click a trigger, or press Cmd/Ctrl+K, to see its callback fire."}
        </Text>
      </div>
    </div>
  );
}

export function TopBarWithNotificationsDemo() {
  return (
    <div style={TOPBAR_STAGE_STYLE}>
      <TopBar
        contextLabel="Tasks"
        timeZone="America/New_York"
        locale="en-US"
        notificationCount={128}
        onSearchTriggerClick={() => {}}
        onQuickAddTriggerClick={() => {}}
        onNotificationsTriggerClick={() => {}}
        account={TOPBAR_ACCOUNT}
      />
      <div style={{ padding: "var(--lifeos-space-4)" }}>
        <Text tone="secondary" size="sm">
          128 unread clamps the bell&rsquo;s CountBadge to &ldquo;99+&rdquo; while still announcing
          the exact count.
        </Text>
      </div>
    </div>
  );
}

export function TopBarWithFocusSlotDemo() {
  return (
    <div style={TOPBAR_STAGE_STYLE}>
      <TopBar
        contextLabel="Today"
        timeZone="Asia/Kolkata"
        locale="en-US"
        focusSlot={<StatusDot tone="success" label="Focus session active, 18 minutes remaining" />}
        onSearchTriggerClick={() => {}}
        onQuickAddTriggerClick={() => {}}
        onNotificationsTriggerClick={() => {}}
        account={TOPBAR_ACCOUNT}
      />
      <div style={{ padding: "var(--lifeos-space-4)" }}>
        <Text tone="secondary" size="sm">
          focusSlot is caller-owned; TopBar renders nothing here on its own. LOS-0605&apos;s real
          mini-player is expected to fill this slot later.
        </Text>
      </div>
    </div>
  );
}

export function TopBarOverflowOpenDemo() {
  return (
    <div>
      <Text tone="secondary" size="sm">
        Resize the catalog stage below 768px to see Notifications, Focus, and Account collapse
        behind the &ldquo;More&rdquo; trigger, or click it directly below.
      </Text>
      <div style={{ ...TOPBAR_STAGE_STYLE, marginTop: "var(--lifeos-space-3)" }}>
        <TopBar
          contextLabel="Today"
          timeZone="Asia/Kolkata"
          locale="en-US"
          notificationCount={3}
          focusSlot={<StatusDot tone="success" label="Focus session active" />}
          onSearchTriggerClick={() => {}}
          onQuickAddTriggerClick={() => {}}
          onNotificationsTriggerClick={() => {}}
          account={TOPBAR_ACCOUNT}
        />
      </div>
    </div>
  );
}

const demoQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export function FocusMiniPlayerDemo() {
  return (
    <QueryClientProvider client={demoQueryClient}>
      <AuthSessionProvider>
        <FocusMiniPlayer timeZone="Asia/Kolkata" locale="en-US" />
      </AuthSessionProvider>
    </QueryClientProvider>
  );
}

const TODAY_DEMO_NOW = new Date("2026-08-20T03:30:00Z"); // 09:00 IST — morning

export function TodayHeaderMorningDemo() {
  return (
    <TodayHeader
      displayName="Partha"
      timeZone="Asia/Kolkata"
      locale="en-IN"
      now={TODAY_DEMO_NOW}
      onQuickAddClick={() => {}}
    />
  );
}

export function TodayHeaderEveningDemo() {
  // 18:30 IST
  const evening = new Date("2026-08-20T13:00:00Z");
  return (
    <TodayHeader
      displayName="Partha"
      timeZone="Asia/Kolkata"
      locale="en-IN"
      now={evening}
      subtitle="You have 2 tasks still open."
      onQuickAddClick={() => {}}
    />
  );
}

export function TodayMetricStripLoadingDemo() {
  const loading = { type: "loading" as const };
  return (
    <TodayMetricStrip
      mitStatus={loading}
      tasksStatus={loading}
      scheduledTimeStatus={loading}
      focusTimeStatus={loading}
      activeProjectsStatus={loading}
      weekProgressStatus={loading}
    />
  );
}

export function TodayMetricStripReadyDemo() {
  return (
    <TodayMetricStrip
      mitStatus={{ type: "ready", value: "Write spec" }}
      tasksStatus={{ type: "ready", value: "4 / 6" }}
      scheduledTimeStatus={{ type: "ready", value: "2h 30m" }}
      focusTimeStatus={{ type: "ready", value: "45m / 2h" }}
      activeProjectsStatus={{ type: "ready", value: "3" }}
      weekProgressStatus={{ type: "ready", value: "60%" }}
    />
  );
}

export function TodayMetricStripMixedDemo() {
  return (
    <TodayMetricStrip
      mitStatus={{ type: "empty", message: "Choose today's focus" }}
      tasksStatus={{ type: "ready", value: "2 / 4" }}
      scheduledTimeStatus={{ type: "error", message: "Unavailable." }}
      focusTimeStatus={{ type: "loading" }}
      activeProjectsStatus={{ type: "ready", value: "1" }}
      weekProgressStatus={{ type: "empty", message: "No weekly plan" }}
    />
  );
}

export function TodayHeaderSectionDemo() {
  return (
    <TodayHeaderSection
      displayName="Partha"
      timeZone="Asia/Kolkata"
      locale="en-IN"
      now={TODAY_DEMO_NOW}
      subtitle="See what needs attention and choose what to do next."
      onQuickAddClick={() => {}}
      mitStatus={{ type: "empty", message: "No focus chosen yet." }}
      tasksStatus={{ type: "empty", message: "No tasks planned for today." }}
      scheduledTimeStatus={{ type: "empty", message: "No Time Blocks scheduled today." }}
      focusTimeStatus={{ type: "empty", message: "No focus time recorded today." }}
      activeProjectsStatus={{ type: "empty", message: "No active projects yet." }}
      weekProgressStatus={{ type: "empty", message: "No Weekly Plan yet." }}
    />
  );
}

const TODAY_SCHEDULE_DEMO_BLOCKS: readonly TodayScheduleBlockModel[] = [
  {
    id: "schedule-planning",
    title: "Plan the day",
    href: "#time-block-planning",
    startTime: "08:30",
    endTime: "09:00",
    state: "completed",
    category: "Planning",
  },
  {
    id: "schedule-outline",
    title: "Write launch outline",
    href: "#time-block-outline",
    startTime: "09:30",
    endTime: "10:30",
    state: "current",
    category: "Deep work",
    project: { id: "website", name: "Website launch", href: "#project-website" },
    conflictDescriptions: ["This Time Block overlaps Research by 30 minutes."],
  },
  {
    id: "schedule-review",
    title: "Review launch copy",
    href: "#time-block-review",
    startTime: "11:00",
    endTime: "11:30",
    state: "next",
    project: { id: "website", name: "Website launch", href: "#project-website" },
  },
  {
    id: "schedule-daily-review",
    title: "Daily review",
    href: "#time-block-daily-review",
    startTime: "17:00",
    endTime: "17:15",
    state: "upcoming",
    category: "Review",
  },
];

export function TodayScheduleReadyDemo() {
  return (
    <TodaySchedule
      state={{ type: "ready", blocks: TODAY_SCHEDULE_DEMO_BLOCKS }}
      locale="en-IN"
      onAddTimeBlock={() => {}}
      onStartFocus={() => {}}
    />
  );
}

export function TodayScheduleFirstUseDemo() {
  return (
    <TodaySchedule
      state={{ type: "empty" }}
      locale="en-IN"
      onAddTimeBlock={() => {}}
      onStartFocus={() => {}}
    />
  );
}

export function TodayScheduleLoadingDemo() {
  return (
    <TodaySchedule
      state={{ type: "loading" }}
      locale="en-IN"
      onAddTimeBlock={() => {}}
      onStartFocus={() => {}}
    />
  );
}

export function TodayScheduleErrorDemo() {
  return (
    <TodaySchedule
      state={{ type: "error", message: "Other Today sections are still available." }}
      locale="en-IN"
      onAddTimeBlock={() => {}}
      onStartFocus={() => {}}
      onRetry={() => {}}
    />
  );
}
