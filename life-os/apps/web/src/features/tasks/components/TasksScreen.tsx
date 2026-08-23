import { useMemo, useState } from "react";
import { Plus } from "lucide-react";

import {
  DataTable,
  PageHeader,
  SortControl,
  Tabs,
  ViewToggle,
  type DataTableColumn,
  type TabItem,
} from "@components/navigation";
import { SearchField, DateTimeField, type DateTimeValue } from "@components/forms";
import { Alert, ConfirmDialog, DetailPanel, Dialog } from "@components/feedback";
import { Badge, Button, Link, ProgressBar, Select, Text, VisuallyHidden } from "@components/ui";
import { resolveLocalDateTime, todayLocalDate } from "@lib/localDateTime";

import { TaskBulkActions } from "./TaskBulkActions";
import { TaskCard } from "./TaskCard";
import {
  TaskForm,
  type TaskFormData,
  type TaskFormLabelOption,
  type TaskFormProjectOption,
} from "./TaskForm";
import { TaskRow } from "./TaskRow";
import { TaskSummaryMetrics, type TaskSummaryMetricsStatus } from "./TaskSummaryMetrics";
import { TaskActions } from "./TaskActions";
import { MOCK_TASK_LABELS, MOCK_TASK_PROJECTS, MOCK_TASKS } from "../model/mockTasks";
import type { TaskRecord } from "../model/task";
import { toTaskListItem } from "../model/task";
import type { TaskFilterPresetId } from "../model/taskFilterPresets";
import {
  applyBulkToTasks,
  countTaskSummary,
  DEFAULT_TASK_SORT,
  describeBulkError,
  filterTasks,
  paginateTasks,
  sortTasks,
  TASK_SORT_OPTIONS,
  TASKS_VIEW_TABS,
  type BulkActionOutcome,
  type BulkTaskAction,
  type TaskSortState,
  type TasksViewMode,
  type TasksViewTab,
} from "../model/taskScreen";
import {
  formatTaskDueAt,
  TASK_PRIORITY_BADGE_TONE,
  TASK_PRIORITY_LABEL,
  TASK_STATUS_BADGE_TONE,
  TASK_STATUS_LABEL,
} from "../model/taskPresentation";
import "./tasks-screen.css";

const PAGE_SIZE = 5;

const TAB_ITEMS: readonly TabItem[] = TASKS_VIEW_TABS.map((tab) => ({
  id: tab.id,
  label: tab.label,
  panel: null,
}));

export interface TasksScreenProps {
  readonly initialTasks?: readonly TaskRecord[];
  readonly tasks?: readonly TaskRecord[];
  readonly summaryStatus?: TaskSummaryMetricsStatus;
  readonly loading?: boolean;
  readonly error?: string | null;
  readonly tab?: TasksViewTab;
  readonly searchQuery?: string;
  readonly priorityFilter?: string;
  readonly projectFilter?: string;
  readonly sortState?: TaskSortState;
  readonly viewMode?: TasksViewMode;
  readonly currentPage?: number;
  readonly totalPages?: number;
  readonly totalItems?: number;
  readonly pageSize?: number;
  readonly selectedIds?: ReadonlySet<string>;
  readonly selectedTask?: TaskRecord | null;
  readonly projects?: readonly TaskFormProjectOption[];
  readonly labels?: readonly TaskFormLabelOption[];
  readonly bulkOutcome?: BulkActionOutcome | null;
  readonly simulateBulkFailures?: readonly string[];
  readonly formPending?: boolean;
  readonly formError?: string;
  readonly formConflictError?: string;
  readonly now?: Date;
  readonly timeZone?: string;
  readonly locale?: string;
  readonly onTabChange?: (tab: TasksViewTab) => void;
  readonly onSearchQueryChange?: (query: string) => void;
  readonly onPriorityFilterChange?: (priority: string) => void;
  readonly onProjectFilterChange?: (projectId: string) => void;
  readonly onSortChange?: (sort: TaskSortState) => void;
  readonly onViewModeChange?: (mode: TasksViewMode) => void;
  readonly onPageChange?: (page: number) => void;
  readonly onSelectedIdsChange?: (ids: ReadonlySet<string>) => void;
  readonly onSelectTask?: (task: TaskRecord | null) => void;
  readonly onRetry?: () => void;
  readonly onCreateTask?: (data: TaskFormData) => Promise<void> | void;
  readonly onUpdateTask?: (id: string, data: TaskFormData) => Promise<void> | void;
  readonly onArchiveTask?: (task: TaskRecord) => Promise<void> | void;
  readonly onRestoreTask?: (task: TaskRecord) => Promise<void> | void;
  readonly onDeleteTask?: (task: TaskRecord) => Promise<void> | void;
  readonly onDuplicateTask?: (task: TaskRecord) => Promise<void> | void;
  readonly onMarkDone?: (task: TaskRecord) => Promise<void> | void;
  readonly onReopen?: (task: TaskRecord) => Promise<void> | void;
  readonly onToggleMit?: (task: TaskRecord) => Promise<void> | void;
  readonly onBulkAction?: (
    ids: readonly string[],
    action: BulkTaskAction,
  ) => Promise<BulkActionOutcome | void> | BulkActionOutcome | void;
  readonly onReloadLatest?: () => void;
  readonly onDismissBulkOutcome?: () => void;
}

export function TasksScreen({
  initialTasks = MOCK_TASKS,
  tasks: controlledTasks,
  summaryStatus: controlledSummary,
  loading = false,
  error = null,
  tab: controlledTab,
  searchQuery: controlledSearchQuery,
  priorityFilter: controlledPriorityFilter,
  projectFilter: controlledProjectFilter,
  sortState: controlledSortState,
  viewMode: controlledViewMode,
  currentPage: controlledCurrentPage,
  totalItems: controlledTotalItems,
  pageSize = PAGE_SIZE,
  selectedIds: controlledSelectedIds,
  selectedTask: controlledSelectedTask,
  projects = MOCK_TASK_PROJECTS,
  labels = MOCK_TASK_LABELS,
  bulkOutcome: controlledBulkOutcome,
  simulateBulkFailures = [],
  formPending = false,
  formError,
  formConflictError,
  now = new Date("2026-08-21T12:00:00Z"),
  timeZone = "UTC",
  locale = "en-US",
  onTabChange,
  onSearchQueryChange,
  onPriorityFilterChange,
  onProjectFilterChange,
  onSortChange,
  onViewModeChange,
  onPageChange,
  onSelectedIdsChange,
  onSelectTask,
  onRetry,
  onCreateTask,
  onUpdateTask,
  onArchiveTask,
  onRestoreTask,
  onDeleteTask,
  onDuplicateTask,
  onMarkDone,
  onReopen,
  onToggleMit,
  onBulkAction,
  onReloadLatest,
  onDismissBulkOutcome,
}: TasksScreenProps) {
  const [internalTasks, setInternalTasks] = useState<readonly TaskRecord[]>(initialTasks);
  const [internalTab, setInternalTab] = useState<TasksViewTab>("ALL");
  const [searchDraft, setSearchDraft] = useState(controlledSearchQuery ?? "");
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const [internalPriority, setInternalPriority] = useState("ALL");
  const [internalProject, setInternalProject] = useState("ALL");
  const [internalSort, setInternalSort] = useState<TaskSortState>(DEFAULT_TASK_SORT);
  const [internalView, setInternalView] = useState<TasksViewMode>("table");
  const [internalPage, setInternalPage] = useState(1);
  const [internalSelectedIds, setInternalSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const [internalSelectedTask, setInternalSelectedTask] = useState<TaskRecord | null>(null);
  const [internalBulkOutcome, setInternalBulkOutcome] = useState<BulkActionOutcome | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: "archive" | "delete" | "bulk-archive";
    task: TaskRecord | null;
  }>({ open: false, type: "archive", task: null });
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleValue, setScheduleValue] = useState<DateTimeValue>({ date: null, time: null });
  const [scheduleError, setScheduleError] = useState<string | undefined>(undefined);

  const isControlled = controlledTasks !== undefined;
  const tasks = controlledTasks ?? internalTasks;
  const tab = controlledTab ?? internalTab;
  const searchQuery = controlledSearchQuery ?? internalSearchQuery;
  const priorityFilter = controlledPriorityFilter ?? internalPriority;
  const projectFilter = controlledProjectFilter ?? internalProject;
  const sortState = controlledSortState ?? internalSort;
  const viewMode = controlledViewMode ?? internalView;
  const currentPage = controlledCurrentPage ?? internalPage;
  const selectedIds = controlledSelectedIds ?? internalSelectedIds;
  const selectedTask =
    controlledSelectedTask !== undefined ? controlledSelectedTask : internalSelectedTask;
  const bulkOutcome =
    controlledBulkOutcome !== undefined ? controlledBulkOutcome : internalBulkOutcome;
  const activePreset: TaskFilterPresetId | null = tab === "ARCHIVED" ? null : tab;

  const computedSummary = useMemo(() => countTaskSummary(tasks, now), [tasks, now]);
  const summaryStatus: TaskSummaryMetricsStatus = controlledSummary
    ? controlledSummary
    : error
      ? { type: "error", message: error, ...(onRetry ? { onRetry } : {}) }
      : loading
        ? { type: "loading" }
        : computedSummary.total === 0 && tab === "ALL" && !searchQuery
          ? { type: "empty" }
          : { type: "ready", counts: computedSummary };

  const filteredTasks = useMemo(() => {
    if (isControlled) return tasks;
    return filterTasks(
      tasks,
      { tab, search: searchQuery, priority: priorityFilter, projectId: projectFilter },
      now,
    );
  }, [isControlled, tasks, tab, searchQuery, priorityFilter, projectFilter, now]);

  const sortedTasks = useMemo(() => {
    if (isControlled) return filteredTasks;
    return sortTasks(filteredTasks, sortState);
  }, [isControlled, filteredTasks, sortState]);

  const totalItemsCount = controlledTotalItems ?? sortedTasks.length;

  const visibleTasks = useMemo(() => {
    if (isControlled) return tasks;
    return paginateTasks(sortedTasks, currentPage, pageSize);
  }, [isControlled, tasks, sortedTasks, currentPage, pageSize]);

  function setTab(next: TasksViewTab) {
    setInternalTab(next);
    setInternalPage(1);
    onTabChange?.(next);
  }

  function setSelectedIds(next: ReadonlySet<string>) {
    setInternalSelectedIds(next);
    onSelectedIdsChange?.(next);
  }

  function openDetails(task: TaskRecord) {
    setInternalSelectedTask(task);
    onSelectTask?.(task);
  }

  function closeDetails() {
    setInternalSelectedTask(null);
    onSelectTask?.(null);
  }

  function handleOpenCreate() {
    setEditingTask(null);
    setFormMode("create");
    setFormOpen(true);
  }

  function handleOpenEdit(task: TaskRecord) {
    setEditingTask(task);
    setFormMode("edit");
    setFormOpen(true);
  }

  async function handleFormSubmit(data: TaskFormData) {
    if (formMode === "create") {
      const created = recordFromForm(data, { now, projects, id: `task-${Date.now()}` });
      setInternalTasks((prev) => [created, ...prev]);
      await onCreateTask?.(data);
    } else if (editingTask) {
      const updated = recordFromForm(data, {
        now,
        projects,
        id: editingTask.id,
        base: editingTask,
      });
      setInternalTasks((prev) => prev.map((task) => (task.id === editingTask.id ? updated : task)));
      await onUpdateTask?.(editingTask.id, data);
    }
    setFormOpen(false);
  }

  async function applyLocalTask(next: TaskRecord) {
    setInternalTasks((prev) => prev.map((task) => (task.id === next.id ? next : task)));
  }

  async function handleMarkDone(task: TaskRecord) {
    await applyLocalTask({
      ...task,
      status: "DONE",
      progress: 100,
      isMit: false,
      mitDate: null,
      overdue: false,
      updatedAt: now.toISOString(),
      version: task.version + 1,
    });
    await onMarkDone?.(task);
  }

  async function handleReopen(task: TaskRecord) {
    await applyLocalTask({
      ...task,
      status: "TO_DO",
      updatedAt: now.toISOString(),
      version: task.version + 1,
    });
    await onReopen?.(task);
  }

  async function handleToggleMit(task: TaskRecord) {
    const mitDate = task.isMit ? null : todayLocalDate(timeZone, now);
    await applyLocalTask({
      ...task,
      isMit: mitDate !== null,
      mitDate,
      updatedAt: now.toISOString(),
      version: task.version + 1,
    });
    await onToggleMit?.(task);
  }

  async function handleDuplicate(task: TaskRecord) {
    const copy: TaskRecord = {
      ...task,
      id: `task-${Date.now()}`,
      title: `Copy of ${task.title}`,
      isMit: false,
      mitDate: null,
      archivedAt: null,
      version: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    setInternalTasks((prev) => [copy, ...prev]);
    await onDuplicateTask?.(task);
  }

  async function handleRestore(task: TaskRecord) {
    await applyLocalTask({
      ...task,
      archivedAt: null,
      updatedAt: now.toISOString(),
      version: task.version + 1,
    });
    await onRestoreTask?.(task);
  }

  async function handleConfirm() {
    const { type, task } = confirmState;
    if (type === "bulk-archive") {
      await runBulk({ type: "ARCHIVE" });
    } else if (task && type === "archive") {
      await applyLocalTask({
        ...task,
        archivedAt: now.toISOString(),
        isMit: false,
        mitDate: null,
        updatedAt: now.toISOString(),
        version: task.version + 1,
      });
      await onArchiveTask?.(task);
    } else if (task && type === "delete") {
      setInternalTasks((prev) => prev.filter((item) => item.id !== task.id));
      await onDeleteTask?.(task);
      if (selectedTask?.id === task.id) closeDetails();
    }
    setConfirmState({ open: false, type: "archive", task: null });
  }

  async function runBulk(action: BulkTaskAction) {
    const ids = [...selectedIds];
    if (onBulkAction) {
      const result = await onBulkAction(ids, action);
      if (result) {
        applyBulkOutcome(result);
      } else {
        setSelectedIds(new Set());
        setInternalBulkOutcome(null);
      }
      return;
    }

    const { tasks: next, outcome } = applyBulkToTasks(tasks, selectedIds, action, {
      nowIso: now.toISOString(),
      projects,
      failIds: new Set(simulateBulkFailures),
    });
    setInternalTasks(next);
    applyBulkOutcome(outcome);
  }

  function applyBulkOutcome(outcome: BulkActionOutcome) {
    setInternalBulkOutcome(outcome.failed.length > 0 ? outcome : null);
    setSelectedIds(new Set(outcome.failed.map((item) => item.taskId)));
  }

  function handleScheduleSubmit() {
    if (!scheduleValue.date || !scheduleValue.time) {
      setScheduleError("Enter both a date and a time.");
      return;
    }
    const resolution = resolveLocalDateTime(scheduleValue.date, scheduleValue.time, timeZone);
    if (resolution.kind === "nonexistent") {
      setScheduleError("That date and time does not exist in this timezone.");
      return;
    }
    setScheduleError(undefined);
    setScheduleOpen(false);
    void runBulk({ type: "SCHEDULE", dueAt: new Date(resolution.instantMs).toISOString() });
  }

  const hasActiveFilters =
    Boolean(searchQuery.trim()) || priorityFilter !== "ALL" || projectFilter !== "ALL";
  const emptyKind =
    tab === "ARCHIVED"
      ? "archived"
      : searchQuery.trim()
        ? "search"
        : hasActiveFilters || tab !== "ALL"
          ? "filtered"
          : "first-use";

  const columns: readonly DataTableColumn<TaskRecord>[] = [
    {
      key: "title",
      header: "Task",
      truncate: true,
      render: (task) => (
        <div>
          <Button
            variant="link"
            className="lifeos-tasks-screen__title-button"
            onClick={() => openDetails(task)}
          >
            {task.title}
          </Button>
          {task.isMit ? (
            <div className="lifeos-tasks-screen__title-meta">
              <Badge tone="accent">
                MIT<VisuallyHidden> — Most Important Task</VisuallyHidden>
              </Badge>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      key: "project",
      header: "Project",
      render: (task) =>
        task.project ? (
          <Link href={task.project.href ?? `/life-os/app/projects/${task.project.id}`} quiet>
            {task.project.name}
          </Link>
        ) : (
          <Text size="sm" tone="muted">
            No project
          </Text>
        ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (task) => (
        <Badge tone={TASK_PRIORITY_BADGE_TONE[task.priority]}>
          {TASK_PRIORITY_LABEL[task.priority]}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (task) => (
        <Badge tone={TASK_STATUS_BADGE_TONE[task.status]}>{TASK_STATUS_LABEL[task.status]}</Badge>
      ),
    },
    {
      key: "dueAt",
      header: "Due",
      render: (task) => (
        <Text
          size="sm"
          tone={task.overdue ? "danger" : "secondary"}
          className="lifeos-tasks-screen__due-cell"
        >
          {task.dueAt ? (
            <time dateTime={task.dueAt}>{formatTaskDueAt(task.dueAt, locale, timeZone)}</time>
          ) : (
            "No due date"
          )}
        </Text>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (task) => (
        <ProgressBar
          label={`${task.title} progress`}
          labelHidden
          value={task.progress}
          valueText={`${task.progress}% complete`}
          size="sm"
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (task) => (
        <TaskActions
          task={toTaskListItem(task)}
          onEdit={() => handleOpenEdit(task)}
          onToggleMit={() => void handleToggleMit(task)}
          onMarkDone={() => void handleMarkDone(task)}
          onReopen={() => void handleReopen(task)}
          onDuplicate={() => void handleDuplicate(task)}
          onArchive={() => setConfirmState({ open: true, type: "archive", task })}
          onRestore={() => void handleRestore(task)}
          onDelete={() => setConfirmState({ open: true, type: "delete", task })}
        />
      ),
    },
  ];

  const listItem = toTaskListItem;
  const cardOrRow = (task: TaskRecord) => {
    const shared = {
      task: listItem(task),
      selected: selectedIds.has(task.id),
      onSelectedChange: (selected: boolean) => {
        const next = new Set(selectedIds);
        if (selected) next.add(task.id);
        else next.delete(task.id);
        setSelectedIds(next);
      },
      locale,
      timeZone,
      now,
      onEdit: () => handleOpenEdit(task),
      onToggleMit: () => void handleToggleMit(task),
      onMarkDone: () => void handleMarkDone(task),
      onReopen: () => void handleReopen(task),
      onDuplicate: () => void handleDuplicate(task),
      onArchive: () => setConfirmState({ open: true, type: "archive", task }),
      onRestore: () => void handleRestore(task),
      onDelete: () => setConfirmState({ open: true, type: "delete", task }),
    };
    return viewMode === "list" ? <TaskRow {...shared} /> : <TaskCard {...shared} />;
  };

  const activeChips = [
    ...(searchQuery.trim()
      ? [
          {
            id: "q",
            label: `Search: ${searchQuery.trim()}`,
            onRemove: () => {
              setSearchDraft("");
              setInternalSearchQuery("");
              setInternalPage(1);
              onSearchQueryChange?.("");
            },
          },
        ]
      : []),
    ...(priorityFilter !== "ALL"
      ? [
          {
            id: "priority",
            label: `Priority: ${TASK_PRIORITY_LABEL[priorityFilter as TaskRecord["priority"]] ?? priorityFilter}`,
            onRemove: () => {
              setInternalPriority("ALL");
              setInternalPage(1);
              onPriorityFilterChange?.("ALL");
            },
          },
        ]
      : []),
    ...(projectFilter !== "ALL"
      ? [
          {
            id: "project",
            label: `Project: ${
              projectFilter === "NONE"
                ? "No project"
                : (projects.find((item) => item.id === projectFilter)?.name ?? projectFilter)
            }`,
            onRemove: () => {
              setInternalProject("ALL");
              setInternalPage(1);
              onProjectFilterChange?.("ALL");
            },
          },
        ]
      : []),
  ];

  function clearFilters() {
    setSearchDraft("");
    setInternalSearchQuery("");
    setInternalPriority("ALL");
    setInternalProject("ALL");
    setInternalTab("ALL");
    setInternalPage(1);
    onSearchQueryChange?.("");
    onPriorityFilterChange?.("ALL");
    onProjectFilterChange?.("ALL");
    onTabChange?.("ALL");
  }

  return (
    <div className="lifeos-tasks-screen">
      <PageHeader
        title="Tasks"
        description="Choose, schedule and mark work done."
        breadcrumbs={[
          { label: "Today", href: "/life-os/app/today" },
          { label: "Tasks", href: "/life-os/app/tasks" },
        ]}
        primaryAction={
          <Button onClick={handleOpenCreate}>
            <Plus aria-hidden="true" size={16} /> Add task
          </Button>
        }
      />

      <TaskSummaryMetrics
        status={summaryStatus}
        activePreset={activePreset}
        onSelectPreset={(preset) => setTab(preset)}
        disabled={loading}
      />

      <div className="lifeos-tasks-screen__controls">
        <Tabs
          label="Task views"
          items={TAB_ITEMS}
          selectedId={tab}
          onSelectedIdChange={(id) => setTab(id as TasksViewTab)}
        />
      </div>

      {bulkOutcome && bulkOutcome.failed.length > 0 ? (
        <Alert
          tone="warning"
          heading="Some tasks couldn't be updated"
          announce="alert"
          onDismiss={() => {
            setInternalBulkOutcome(null);
            onDismissBulkOutcome?.();
          }}
        >
          <p>
            {bulkOutcome.failed.length} of {bulkOutcome.requested} selected tasks were not changed.
            Failed tasks stay selected.
          </p>
          <ul className="lifeos-tasks-bulk-failures">
            {bulkOutcome.failed.map((item) => (
              <li key={item.taskId}>
                {item.title}: {describeBulkError(item.errorCode)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      <div className={`lifeos-tasks-screen__results lifeos-tasks-screen__results--${viewMode}`}>
        <DataTable
          label="Tasks"
          columns={columns}
          rows={visibleTasks}
          getRowId={(task) => task.id}
          getRowLabel={(task) => task.title}
          status={
            error
              ? { type: "error", message: error, ...(onRetry ? { onRetry } : {}) }
              : loading
                ? { type: "loading" }
                : { type: "ready" }
          }
          emptyTitle={
            emptyKind === "archived"
              ? "No archived tasks"
              : emptyKind === "search"
                ? `No results for “${searchQuery.trim()}”.`
                : emptyKind === "filtered"
                  ? "No tasks match these filters."
                  : "No tasks yet"
          }
          emptyDescription={
            emptyKind === "archived"
              ? "Archived tasks will appear here."
              : emptyKind === "search"
                ? "Try fewer words or add a new task."
                : emptyKind === "filtered"
                  ? "Clear filters to see more tasks."
                  : "Add a task when you know what needs action."
          }
          emptyVariant={
            emptyKind === "archived"
              ? "archived"
              : emptyKind === "search"
                ? "search"
                : emptyKind === "filtered"
                  ? "filtered"
                  : "first-use"
          }
          filters={{
            controls: (
              <div className="lifeos-tasks-screen__toolbar">
                <div className="lifeos-tasks-screen__search">
                  <SearchField
                    label="Search tasks"
                    placeholder="Search tasks"
                    value={searchDraft}
                    onValueChange={(value) => {
                      setSearchDraft(value);
                      if (value === "") {
                        setInternalSearchQuery("");
                        setInternalPage(1);
                        onSearchQueryChange?.("");
                      }
                    }}
                    onSearch={(query) => {
                      setInternalSearchQuery(query);
                      setInternalPage(1);
                      onSearchQueryChange?.(query);
                    }}
                  />
                </div>
                <div className="lifeos-tasks-screen__filters">
                  <Select
                    label="Priority"
                    labelHidden
                    value={priorityFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setInternalPriority(value);
                      setInternalPage(1);
                      onPriorityFilterChange?.(value);
                    }}
                    options={[
                      { value: "ALL", label: "All priorities" },
                      { value: "P1", label: TASK_PRIORITY_LABEL.P1 },
                      { value: "P2", label: TASK_PRIORITY_LABEL.P2 },
                      { value: "P3", label: TASK_PRIORITY_LABEL.P3 },
                      { value: "P4", label: TASK_PRIORITY_LABEL.P4 },
                    ]}
                  />
                  <Select
                    label="Project"
                    labelHidden
                    value={projectFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setInternalProject(value);
                      setInternalPage(1);
                      onProjectFilterChange?.(value);
                    }}
                    options={[
                      { value: "ALL", label: "All projects" },
                      { value: "NONE", label: "No project" },
                      ...projects.map((project) => ({ value: project.id, label: project.name })),
                    ]}
                  />
                  <ViewToggle
                    label="Task list view"
                    value={viewMode}
                    onChange={(mode) => {
                      setInternalView(mode);
                      onViewModeChange?.(mode);
                    }}
                  />
                  <SortControl
                    options={TASK_SORT_OPTIONS}
                    value={sortState}
                    onChange={(next) => {
                      setInternalSort(next);
                      onSortChange?.(next);
                    }}
                  />
                </div>
                <Text tone="secondary" size="sm" className="lifeos-tasks-screen__result-count">
                  {totalItemsCount} {totalItemsCount === 1 ? "task" : "tasks"}
                </Text>
              </div>
            ),
            activeChips,
            ...(hasActiveFilters ? { onClearAll: clearFilters } : {}),
          }}
          {...(totalItemsCount > pageSize
            ? {
                pagination: {
                  page: currentPage,
                  pageSize,
                  total: totalItemsCount,
                  onPageChange: (page: number) => {
                    setInternalPage(page);
                    onPageChange?.(page);
                  },
                },
              }
            : {})}
          selection={{
            selectedIds,
            onSelectedIdsChange: setSelectedIds,
            bulkActions: (
              <TaskBulkActions
                projects={projects}
                labels={labels}
                disabled={loading}
                onAction={(action) => void runBulk(action)}
                onSchedule={() => {
                  setScheduleValue({ date: null, time: null });
                  setScheduleError(undefined);
                  setScheduleOpen(true);
                }}
                onArchive={() => setConfirmState({ open: true, type: "bulk-archive", task: null })}
              />
            ),
          }}
          renderCard={cardOrRow}
        />
      </div>

      <TaskForm
        open={formOpen}
        mode={formMode}
        timeZone={timeZone}
        locale={locale}
        projects={projects}
        labels={labels}
        isPending={formPending}
        {...(formError ? { error: formError } : {})}
        {...(formConflictError ? { conflictError: formConflictError } : {})}
        {...(onReloadLatest
          ? {
              onReloadLatest: () => {
                onReloadLatest();
                setFormOpen(false);
              },
            }
          : {})}
        initialValues={
          editingTask
            ? {
                id: editingTask.id,
                projectId: editingTask.project?.id ?? null,
                title: editingTask.title,
                description: editingTask.description,
                status: editingTask.status,
                priority: editingTask.priority,
                dueAt: editingTask.dueAt,
                estimateMinutes: editingTask.estimateMinutes,
                progress: editingTask.progress,
                mitDate: editingTask.mitDate,
                labelIds: editingTask.labelIds,
                version: editingTask.version,
              }
            : null
        }
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <ConfirmDialog
        open={confirmState.open}
        onClose={() => setConfirmState({ open: false, type: "archive", task: null })}
        onConfirm={() => void handleConfirm()}
        title={
          confirmState.type === "delete"
            ? `Delete “${confirmState.task?.title}”?`
            : confirmState.type === "bulk-archive"
              ? `Archive ${selectedIds.size} selected tasks?`
              : `Archive “${confirmState.task?.title}”?`
        }
        description={
          confirmState.type === "delete"
            ? "This cannot be undone from this list. Linked comments and files stay until they are removed separately."
            : confirmState.type === "bulk-archive"
              ? "Archiving hides these tasks from active views. You can restore them later from Archived."
              : "Archiving hides this task from active views. You can restore it later from Archived."
        }
        confirmLabel={
          confirmState.type === "delete"
            ? "Delete task"
            : confirmState.type === "bulk-archive"
              ? "Archive tasks"
              : "Archive task"
        }
      />

      <Dialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        title="Schedule selected tasks"
        description="Sets the due date and time for every selected task."
        size="sm"
      >
        <DateTimeField
          legend="Due date and time"
          value={scheduleValue}
          onValueChange={setScheduleValue}
          timeZone={timeZone}
          {...(scheduleError ? { error: scheduleError } : {})}
        />
        <Button type="button" onClick={handleScheduleSubmit}>
          Set due date
        </Button>
      </Dialog>

      <DetailPanel
        open={Boolean(selectedTask)}
        onClose={closeDetails}
        title={selectedTask?.title ?? "Task details"}
        content={
          selectedTask ? (
            <div className="lifeos-tasks-detail-preview">
              <Text>{selectedTask.description || "No description provided."}</Text>
              <div className="lifeos-tasks-detail-preview__meta">
                <Text size="sm">Status: {TASK_STATUS_LABEL[selectedTask.status]}</Text>
                <Text size="sm">Priority: {TASK_PRIORITY_LABEL[selectedTask.priority]}</Text>
                {selectedTask.project ? (
                  <Text size="sm">Project: {selectedTask.project.name}</Text>
                ) : (
                  <Text size="sm">No project</Text>
                )}
                <Text size="sm">Progress: {selectedTask.progress}% complete</Text>
              </div>
              <Link href={selectedTask.href ?? `/life-os/app/tasks/${selectedTask.id}`}>
                Open task details
              </Link>
              <Button
                variant="secondary"
                onClick={() => {
                  handleOpenEdit(selectedTask);
                }}
              >
                Edit task
              </Button>
            </div>
          ) : null
        }
      />
    </div>
  );
}

function recordFromForm(
  data: TaskFormData,
  options: {
    readonly now: Date;
    readonly projects: readonly TaskFormProjectOption[];
    readonly id: string;
    readonly base?: TaskRecord;
  },
): TaskRecord {
  const project = data.projectId
    ? options.projects.find((item) => item.id === data.projectId)
    : undefined;
  const nowIso = options.now.toISOString();
  return {
    id: options.id,
    title: data.title,
    description: data.description,
    status: data.status,
    priority: data.priority,
    project: project
      ? { id: project.id, name: project.name, href: `/life-os/app/projects/${project.id}` }
      : null,
    dueAt: data.dueAt,
    estimateMinutes: data.estimateMinutes,
    progress: data.progress,
    mitDate: data.mitDate,
    isMit: data.mitDate !== null,
    commentCount: options.base?.commentCount ?? 0,
    blockerCount: options.base?.blockerCount ?? 0,
    overdue: false,
    archivedAt: options.base?.archivedAt ?? null,
    labelIds: data.labelIds,
    version: (options.base?.version ?? 0) + 1,
    createdAt: options.base?.createdAt ?? nowIso,
    updatedAt: nowIso,
  };
}
