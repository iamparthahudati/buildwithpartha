import { useRef, useState, type FormEvent } from "react";

import { Button, Select, Text, TextInput } from "@components/ui";
import {
  ProjectRow,
  ProjectCard,
  ProjectDetailsHeader,
  ProjectOverview,
  ProjectForm,
  ProjectSummaryMetrics,
  ProjectTimeline,
  ProjectDetailsScreen,
  type Project,
  type ProjectFilterCategory,
  type ProjectOverviewTask,
  type Milestone,
} from "@features/projects";
import {
  TASK_FILTER_PRESETS,
  TaskCard,
  DependencyEditor,
  SchedulingPanel,
  TaskDetailsHeader,
  TaskForm,
  TaskRow,
  SubtaskChecklist,
  TaskSummaryMetrics,
  type SubtaskChecklistItem,
  type DependencyEditorTask,
  type SchedulingPanelTask,
  type TaskDetailsHeaderTask,
  type TaskFilterPresetId,
  type TaskListItem,
  type TaskSummaryMetricsStatus,
} from "@features/tasks";
import {
  TimeBlockRow,
  TimeBlockForm,
  DayTimeline,
  TimeSummary,
  type TimeBlock,
} from "@features/time-blocks";
import type { ActivityTypeFilter } from "@features/activity";
import {
  buildCommonDateRangePresets,
  ColorIconPicker,
  type ColorIconValue,
  Combobox,
  type ComboboxOption,
  DateRangeField,
  type DateRangeValue,
  DateTimeField,
  type DateTimeValue,
  DurationField,
  FormErrorSummary,
  FormField,
  FormFieldGroup,
  SearchField,
} from "@components/forms";

/**
 * Interactive demos for the composed-component catalog entries. They live
 * apart from the entry registry so that file exports only data and this one
 * only components, which keeps React Fast Refresh working.
 */

const PROJECT_OPTIONS = [
  { value: "portfolio-refresh", label: "Portfolio refresh" },
  { value: "home-records-cleanup", label: "Home records cleanup" },
];

export function CreateTaskFormDemo() {
  const [title, setTitle] = useState("");
  const [project, setProject] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  // "Notes" is genuinely optional: it never produces an error, which is what
  // separates its (optional) label from the required fields beside it.
  const titleError = submitted && title.trim() === "" ? "Enter a task title." : undefined;
  const projectError = submitted && project === "" ? "Choose a project." : undefined;
  const hasErrors = Boolean(titleError) || Boolean(projectError);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    // The summary appears and takes focus only at the moment a submit has
    // actually failed, never while the user is still filling the form in.
    if (title.trim() === "" || project === "") {
      requestAnimationFrame(() => summaryRef.current?.focus());
    }
  }

  return (
    <FormFieldGroup>
      <form className="specimen-stack" noValidate onSubmit={handleSubmit}>
        {hasErrors ? <FormErrorSummary ref={summaryRef} /> : null}

        <FormField name="title" label="Task title" {...(titleError ? { error: titleError } : {})}>
          {(field) => (
            <TextInput
              {...field}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
        </FormField>

        <FormField
          name="project"
          label="Project"
          {...(projectError ? { error: projectError } : {})}
        >
          {(field) => (
            <Select
              {...field}
              options={PROJECT_OPTIONS}
              placeholder="Choose a project"
              value={project}
              onChange={(event) => setProject(event.target.value)}
            />
          )}
        </FormField>

        <FormField name="notes" label="Notes" required={false}>
          {(field) => (
            <TextInput
              {...field}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          )}
        </FormField>

        <Button type="submit">Create task</Button>
      </form>
    </FormFieldGroup>
  );
}

const RECENT_SEARCHES = [
  "Prepare weekly review",
  "Compare hosting options",
  "Organize tax documents",
];

export function SearchFieldDebouncedDemo() {
  const [value, setValue] = useState("");
  const [lastSearch, setLastSearch] = useState("");

  const resultCount = value.trim() === "" ? undefined : value === "Prepare weekly review" ? 1 : 0;

  return (
    <div className="specimen-stack">
      <SearchField
        label="Search tasks"
        value={value}
        onValueChange={setValue}
        onSearch={setLastSearch}
        shortcutKey="/"
        recentSearches={RECENT_SEARCHES}
        {...(resultCount === undefined ? {} : { resultCount })}
      />
      <Text tone="secondary" size="sm">
        Last search fired: <code>{lastSearch === "" ? "(none yet)" : lastSearch}</code>
      </Text>
    </div>
  );
}

export function SearchFieldSubmitDemo() {
  const [value, setValue] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  return (
    <div className="specimen-stack">
      <SearchField
        label="Search tasks"
        value={value}
        onValueChange={setValue}
        onSearch={setSubmittedSearch}
        mode="submit"
      />
      <Text tone="secondary" size="sm">
        Press Enter to search. Fired:{" "}
        <code>{submittedSearch === "" ? "(none yet)" : submittedSearch}</code>
      </Text>
    </div>
  );
}

const LABEL_OPTIONS: readonly ComboboxOption[] = [
  { value: "deep-work", label: "Deep work" },
  { value: "reading", label: "Reading" },
  { value: "weekly-planning", label: "Weekly planning" },
  { value: "archived", label: "Archived", disabled: true },
];

export function ComboboxSingleDemo() {
  const [value, setValue] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  return (
    <Combobox
      label="Label"
      description="Type to filter, or use the arrow keys."
      options={LABEL_OPTIONS}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
    />
  );
}

export function ComboboxMultiCreateDemo() {
  const [value, setValue] = useState<readonly string[]>([]);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState(LABEL_OPTIONS);

  return (
    <Combobox
      multiple
      label="Labels"
      description="Pick as many as apply, or create one that isn't listed yet."
      options={options}
      value={value}
      onValueChange={setValue}
      query={query}
      onQueryChange={setQuery}
      onCreateOption={(created) => {
        const option: ComboboxOption = {
          value: created.toLowerCase().replace(/\s+/g, "-"),
          label: created,
        };
        setOptions((current) => [...current, option]);
        setValue((current) => [...current, option.value]);
      }}
    />
  );
}

const DATE_RANGE_PRESETS = buildCommonDateRangePresets();

export function DateRangeFieldDemo() {
  const [value, setValue] = useState<DateRangeValue>({ start: null, end: null });

  return (
    <div className="specimen-stack">
      <DateRangeField
        legend="Reporting period"
        description="Shown in your current timezone: Asia/Kolkata."
        timeZone="Asia/Kolkata"
        value={value}
        onValueChange={setValue}
        presets={DATE_RANGE_PRESETS}
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

export function DateRangeFieldInvalidOrderDemo() {
  const [value, setValue] = useState<DateRangeValue>({ start: "2026-08-20", end: "2026-08-10" });

  return (
    <DateRangeField
      legend="Reporting period"
      timeZone="Asia/Kolkata"
      value={value}
      onValueChange={setValue}
    />
  );
}

export function DateTimeFieldDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-08-17", time: "09:30" });

  return (
    <div className="specimen-stack">
      <DateTimeField
        legend="Reminder time"
        timeZone="Asia/Kolkata"
        value={value}
        onValueChange={setValue}
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

/*
 * 2026-03-08 is when America/New_York clocks spring forward: 01:59:59 EST is
 * followed directly by 03:00:00 EDT, so 02:30 never happens on any clock
 * there. A fixed date is used rather than "the next transition from today",
 * so the specimen stays true regardless of when the catalog is viewed.
 */
export function DateTimeFieldGapDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-03-08", time: "02:30" });

  return (
    <DateTimeField
      legend="Reminder time"
      timeZone="America/New_York"
      value={value}
      onValueChange={setValue}
    />
  );
}

/*
 * 2026-11-01 is when America/New_York clocks fall back: 01:59:59 EDT is
 * followed by 01:00:00 EST, so every wall time in that hour happens twice.
 */
export function DateTimeFieldFoldDemo() {
  const [value, setValue] = useState<DateTimeValue>({ date: "2026-11-01", time: "01:30" });

  return (
    <DateTimeField
      legend="Reminder time"
      timeZone="America/New_York"
      value={value}
      onValueChange={setValue}
    />
  );
}

export function DurationFieldDemo() {
  const [value, setValue] = useState<number | null>(90);

  return (
    <div className="specimen-stack">
      <DurationField
        legend="Estimate (optional)"
        locale="en-US"
        value={value}
        onValueChange={setValue}
        description="Your expected effort. You can update it later."
      />
      <Text tone="secondary" size="sm">
        Stored value: <code>{value === null ? "(none)" : `${value} minutes`}</code>
      </Text>
    </div>
  );
}

export function DurationFieldBoundedDemo() {
  const [value, setValue] = useState<number | null>(10);

  return (
    <DurationField
      legend="Focus Session length"
      locale="en-US"
      value={value}
      onValueChange={setValue}
      min={15}
      max={180}
      description="Between 15 minutes and 3 hours."
    />
  );
}

export function ColorIconPickerDemo() {
  // "amber", not one of the swatch names ("blue", "green", "purple", "teal",
  // "red", "olive") that would read as a plain CSS named color to the
  // design-token verifier's `color:`-property check.
  const [value, setValue] = useState<ColorIconValue>({ color: "amber", icon: "rocket" });

  return (
    <div className="specimen-stack">
      <ColorIconPicker legend="Appearance" value={value} onValueChange={setValue} />
      <Text tone="secondary" size="sm">
        Stored value: <code>{JSON.stringify(value)}</code>
      </Text>
    </div>
  );
}

const MOCK_PROJECT_READY: Project = {
  id: "proj-1",
  name: "LifeOS App Launch",
  description: "Bootstrap the UI, build design system, and implement core screens.",
  status: "ACTIVE",
  priority: "P1",
  health: "ON_TRACK",
  color: "blue",
  icon: "rocket",
  startDate: "2026-08-01",
  deadlineDate: "2026-08-30",
  completedTasksCount: 8,
  totalTasksCount: 12,
  updatedAt: "2026-08-20T10:00:00Z",
  version: 1,
};

const MOCK_PROJECT_ARCHIVED: Project = {
  ...MOCK_PROJECT_READY,
  id: "proj-2",
  name: "Legacy Workspaces Migration",
  description: "Migrate old notes and boards to the new personal OS.",
  status: "COMPLETED",
  archivedAt: "2026-08-15T09:00:00Z",
  updatedAt: "2026-08-15T09:00:00Z",
};

const MOCK_PROJECT_OVERDUE: Project = {
  ...MOCK_PROJECT_READY,
  id: "proj-3",
  name: "Weekly Rituals & Planning",
  description: "Establish the weekly review loop and planning screens.",
  status: "ACTIVE",
  priority: "P2",
  health: "OFF_TRACK",
  color: "red",
  icon: "calendar",
  deadlineDate: "2026-08-15",
  completedTasksCount: 2,
  totalTasksCount: 5,
  updatedAt: "2026-08-19T14:30:00Z",
};

const MOCK_PROJECT_NO_TASKS: Project = {
  ...MOCK_PROJECT_READY,
  id: "proj-4",
  name: "Future Someday Project",
  description: "Someday/maybe idea that hasn't been started yet.",
  status: "PLANNED",
  priority: "P4",
  health: "NOT_SET",
  color: "olive",
  icon: "lightbulb",
  deadlineDate: null,
  completedTasksCount: 0,
  totalTasksCount: 0,
};

export function ProjectRowDemo() {
  const now = new Date("2026-08-20T17:00:00Z");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Text tone="secondary" size="xs">
        Default/Active
      </Text>
      <ProjectRow
        project={MOCK_PROJECT_READY}
        now={now}
        onEdit={() => alert("Edit project")}
        onArchive={() => alert("Archive project")}
      />

      <Text tone="secondary" size="xs">
        Overdue
      </Text>
      <ProjectRow project={MOCK_PROJECT_OVERDUE} now={now} />

      <Text tone="secondary" size="xs">
        Archived
      </Text>
      <ProjectRow
        project={MOCK_PROJECT_ARCHIVED}
        now={now}
        onRestore={() => alert("Restore project")}
        onDelete={() => alert("Delete project")}
      />

      <Text tone="secondary" size="xs">
        No tasks
      </Text>
      <ProjectRow project={MOCK_PROJECT_NO_TASKS} now={now} />

      <Text tone="secondary" size="xs">
        Loading
      </Text>
      <ProjectRow loading />
    </div>
  );
}

export function ProjectCardDemo() {
  const now = new Date("2026-08-20T17:00:00Z");

  return (
    <div
      className="specimen-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(20rem, 1fr))",
        gap: "var(--lifeos-space-4)",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-2)" }}>
        <Text tone="secondary" size="xs">
          Active
        </Text>
        <ProjectCard
          project={MOCK_PROJECT_READY}
          now={now}
          onEdit={() => alert("Edit project")}
          onArchive={() => alert("Archive project")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-2)" }}>
        <Text tone="secondary" size="xs">
          Overdue
        </Text>
        <ProjectCard project={MOCK_PROJECT_OVERDUE} now={now} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-2)" }}>
        <Text tone="secondary" size="xs">
          Archived
        </Text>
        <ProjectCard
          project={MOCK_PROJECT_ARCHIVED}
          now={now}
          onRestore={() => alert("Restore project")}
          onDelete={() => alert("Delete project")}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-2)" }}>
        <Text tone="secondary" size="xs">
          Loading
        </Text>
        <ProjectCard loading />
      </div>
    </div>
  );
}

const MOCK_TASK_ACTIVE: TaskListItem = {
  id: "task-809",
  title: "Build TaskRow and TaskCard",
  status: "IN_PROGRESS",
  priority: "P1",
  project: { id: "life-os", name: "LifeOS" },
  dueAt: "2026-08-22T12:00:00Z",
  progress: 45,
  commentCount: 3,
  isMit: true,
};

const MOCK_TASK_BLOCKED: TaskListItem = {
  ...MOCK_TASK_ACTIVE,
  id: "task-blocked",
  title: "Connect the task list API",
  status: "BLOCKED",
  priority: "P2",
  dueAt: "2026-08-19T12:00:00Z",
  progress: 20,
  commentCount: 1,
  isMit: false,
  blockerCount: 2,
};

const MOCK_TASK_DONE: TaskListItem = {
  ...MOCK_TASK_ACTIVE,
  id: "task-done",
  title: "Approve task interaction states",
  status: "DONE",
  priority: "P3",
  dueAt: null,
  progress: 100,
  commentCount: 0,
  isMit: false,
};

const MOCK_TASK_ARCHIVED: TaskListItem = {
  ...MOCK_TASK_DONE,
  id: "task-archived",
  title: "Retire the old task list",
  status: "CANCELLED",
  archivedAt: "2026-08-20T08:00:00Z",
};

function handleTaskDemoAction() {
  alert("Task action selected");
}

export function TaskRowDemo() {
  const [selected, setSelected] = useState(true);
  const now = new Date("2026-08-21T12:00:00Z");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Text tone="secondary" size="xs">
        Active MIT with selection
      </Text>
      <TaskRow
        task={MOCK_TASK_ACTIVE}
        selected={selected}
        onSelectedChange={setSelected}
        onStartFocus={handleTaskDemoAction}
        onToggleMit={handleTaskDemoAction}
        onMarkDone={handleTaskDemoAction}
        onEdit={handleTaskDemoAction}
        onArchive={handleTaskDemoAction}
        now={now}
      />

      <Text tone="secondary" size="xs">
        Overdue and blocked
      </Text>
      <TaskRow task={MOCK_TASK_BLOCKED} now={now} />

      <Text tone="secondary" size="xs">
        Done
      </Text>
      <TaskRow task={MOCK_TASK_DONE} now={now} />

      <Text tone="secondary" size="xs">
        Archived
      </Text>
      <TaskRow
        task={MOCK_TASK_ARCHIVED}
        onRestore={handleTaskDemoAction}
        onDelete={handleTaskDemoAction}
        now={now}
      />

      <Text tone="secondary" size="xs">
        Loading
      </Text>
      <TaskRow loading />
    </div>
  );
}

export function TaskCardDemo() {
  const [selected, setSelected] = useState(true);
  const now = new Date("2026-08-21T12:00:00Z");
  const cards = [MOCK_TASK_ACTIVE, MOCK_TASK_BLOCKED, MOCK_TASK_DONE, MOCK_TASK_ARCHIVED];

  return (
    <div
      className="specimen-grid"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
        gap: "var(--lifeos-space-4)",
        width: "100%",
      }}
    >
      {cards.map((task, index) => (
        <TaskCard
          key={task.id}
          task={task}
          selected={index === 0 && selected}
          {...(index === 0 ? { onSelectedChange: setSelected } : {})}
          {...(task.archivedAt
            ? {
                onRestore: handleTaskDemoAction,
                onDelete: handleTaskDemoAction,
              }
            : { onEdit: handleTaskDemoAction })}
          now={now}
        />
      ))}
      <TaskCard loading />
    </div>
  );
}

const MOCK_TASK_DETAILS: TaskDetailsHeaderTask = {
  id: "task-814",
  title: "Build Task details header",
  description: "Make Task context and actions clear before composing the full details screen.",
  status: "IN_PROGRESS",
  priority: "P1",
  project: { id: "life-os", name: "LifeOS" },
  dueAt: "2026-08-24T12:00:00Z",
  estimateMinutes: 150,
  spentMinutes: 75,
  progress: 50,
  labels: [
    { id: "frontend", name: "Frontend" },
    { id: "accessibility", name: "Accessibility" },
  ],
  isMit: true,
};

export function TaskDetailsHeaderDemo() {
  const now = new Date("2026-08-23T12:00:00Z");

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Text tone="secondary" size="xs">
        Active Task
      </Text>
      <TaskDetailsHeader
        task={MOCK_TASK_DETAILS}
        now={now}
        timeZone="Asia/Kolkata"
        onStartFocus={handleTaskDemoAction}
        onToggleMit={handleTaskDemoAction}
        onMarkDone={handleTaskDemoAction}
        onEdit={handleTaskDemoAction}
        onDuplicate={handleTaskDemoAction}
        onArchive={handleTaskDemoAction}
      />

      <Text tone="secondary" size="xs">
        Sync conflict
      </Text>
      <TaskDetailsHeader
        task={MOCK_TASK_DETAILS}
        now={now}
        conflictError="The details shown here may be out of date. Load the latest Task before making more changes."
        onLoadLatest={handleTaskDemoAction}
      />

      <Text tone="secondary" size="xs">
        Archived Task
      </Text>
      <TaskDetailsHeader
        task={{ ...MOCK_TASK_DETAILS, archivedAt: "2026-08-22T12:00:00Z" }}
        now={now}
        onRestore={handleTaskDemoAction}
        onDelete={handleTaskDemoAction}
      />

      <Text tone="secondary" size="xs">
        Deleted Task
      </Text>
      <TaskDetailsHeader
        task={{ ...MOCK_TASK_DETAILS, deletedAt: "2026-08-23T09:00:00Z" }}
        now={now}
      />

      <Text tone="secondary" size="xs">
        Loading
      </Text>
      <TaskDetailsHeader loading />
    </div>
  );
}

const MOCK_SUBTASKS: readonly SubtaskChecklistItem[] = [
  {
    id: "subtask-outline",
    title: "Outline the interaction states",
    completed: true,
    position: 0,
    version: 1,
  },
  {
    id: "subtask-keyboard",
    title: "Verify keyboard reorder controls",
    completed: false,
    position: 1,
    version: 2,
  },
  {
    id: "subtask-responsive",
    title: "Check the narrow-screen layout",
    completed: false,
    position: 2,
    version: 1,
  },
];

export function SubtaskChecklistDemo({
  state = "ready",
}: {
  readonly state?: "ready" | "loading" | "empty" | "error" | "read-only" | "partial";
}) {
  const [subtasks, setSubtasks] = useState(MOCK_SUBTASKS);

  if (state === "loading") return <SubtaskChecklist loading />;
  if (state === "error") {
    return (
      <SubtaskChecklist error="Task details are still available." onRetry={handleTaskDemoAction} />
    );
  }

  const displayedSubtasks = state === "empty" ? [] : subtasks;
  const readOnly = state === "read-only";

  return (
    <SubtaskChecklist
      subtasks={displayedSubtasks}
      readOnly={readOnly}
      {...(readOnly
        ? {
            readOnlyReason:
              "You can view these Subtasks, but you don't have permission to change them.",
          }
        : {})}
      {...(state === "partial"
        ? {
            pendingOperations: [{ operation: "toggle" as const, subtaskId: "subtask-outline" }],
            operationErrors: [
              {
                operation: "reorder" as const,
                subtaskId: "subtask-keyboard",
                message:
                  "This Subtask couldn't be moved. The saved order is still shown. Try again.",
                onRetry: handleTaskDemoAction,
              },
            ],
          }
        : {})}
      onAdd={(title) => {
        setSubtasks((current) => [
          ...current,
          {
            id: `subtask-${current.length + 1}`,
            title,
            completed: false,
            position: current.length,
            version: 0,
          },
        ]);
      }}
      onEdit={(subtaskId, title) =>
        setSubtasks((current) =>
          current.map((subtask) => (subtask.id === subtaskId ? { ...subtask, title } : subtask)),
        )
      }
      onToggle={(subtaskId, completed) =>
        setSubtasks((current) =>
          current.map((subtask) =>
            subtask.id === subtaskId ? { ...subtask, completed } : subtask,
          ),
        )
      }
      onReorder={(orderedIds) =>
        setSubtasks((current) =>
          orderedIds
            .map((subtaskId) => current.find((subtask) => subtask.id === subtaskId))
            .filter((subtask): subtask is SubtaskChecklistItem => Boolean(subtask))
            .map((subtask, position) => ({ ...subtask, position })),
        )
      }
      onDelete={(subtaskId) =>
        setSubtasks((current) =>
          current
            .filter((subtask) => subtask.id !== subtaskId)
            .map((subtask, position) => ({ ...subtask, position })),
        )
      }
    />
  );
}

const MOCK_DEPENDENCY_TASK: DependencyEditorTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  status: "BLOCKED",
  priority: "P1",
  href: "/life-os/app/tasks/task-weekly-review",
};

const MOCK_BLOCKERS: readonly DependencyEditorTask[] = [
  {
    id: "task-hosting-options",
    title: "Compare hosting options",
    status: "IN_PROGRESS",
    priority: "P2",
    href: "/life-os/app/tasks/task-hosting-options",
  },
  {
    id: "task-organize-records",
    title: "Organize tax documents",
    status: "DONE",
    priority: "P3",
    href: "/life-os/app/tasks/task-organize-records",
  },
];

const MOCK_DEPENDENTS: readonly DependencyEditorTask[] = [
  {
    id: "task-accessibility-course",
    title: "Complete the accessibility course",
    status: "TO_DO",
    priority: "P2",
    href: "/life-os/app/tasks/task-accessibility-course",
  },
];

const MOCK_BLOCKER_OPTIONS: readonly DependencyEditorTask[] = [
  MOCK_DEPENDENCY_TASK,
  ...MOCK_BLOCKERS,
  {
    id: "task-home-records",
    title: "Review home records",
    status: "TO_DO",
    priority: "P3",
    href: "/life-os/app/tasks/task-home-records",
  },
  {
    id: "task-learning-plan",
    title: "Update learning plan",
    status: "IN_PROGRESS",
    priority: "P2",
    href: "/life-os/app/tasks/task-learning-plan",
  },
];

export function DependencyEditorDemo({
  state = "ready",
}: {
  readonly state?: "ready" | "loading" | "empty" | "error" | "read-only" | "partial" | "cycle";
}) {
  const [blockers, setBlockers] = useState(MOCK_BLOCKERS);
  const [dependents, setDependents] = useState(MOCK_DEPENDENTS);

  if (state === "loading") {
    return <DependencyEditor task={MOCK_DEPENDENCY_TASK} loading />;
  }
  if (state === "error") {
    return (
      <DependencyEditor
        task={MOCK_DEPENDENCY_TASK}
        error="Task details are still available."
        onRetry={handleTaskDemoAction}
      />
    );
  }

  const displayedBlockers = state === "empty" ? [] : blockers;
  const displayedDependents = state === "empty" ? [] : dependents;
  const readOnly = state === "read-only";

  return (
    <DependencyEditor
      task={MOCK_DEPENDENCY_TASK}
      blockers={displayedBlockers}
      dependents={displayedDependents}
      blockerOptions={MOCK_BLOCKER_OPTIONS}
      readOnly={readOnly}
      {...(readOnly
        ? {
            readOnlyReason:
              "You can view these dependencies, but you don't have permission to change them.",
          }
        : {})}
      {...(state === "partial"
        ? {
            pendingRemovals: [{ taskId: "task-hosting-options", relationship: "BLOCKER" as const }],
            operationErrors: [
              {
                operation: "remove" as const,
                relationship: "BLOCKER" as const,
                taskId: "task-organize-records",
                reason: "conflict" as const,
                onRetry: handleTaskDemoAction,
              },
            ],
          }
        : {})}
      {...(state === "cycle"
        ? {
            operationErrors: [
              {
                operation: "add" as const,
                relationship: "BLOCKER" as const,
                taskId: "task-learning-plan",
                reason: "cycle" as const,
              },
            ],
          }
        : {})}
      onAddBlocker={(taskId) => {
        const blocker = MOCK_BLOCKER_OPTIONS.find((candidate) => candidate.id === taskId);
        if (blocker) setBlockers((current) => [...current, blocker]);
      }}
      onRemoveDependency={(taskId, relationship) => {
        if (relationship === "BLOCKER") {
          setBlockers((current) => current.filter((blocker) => blocker.id !== taskId));
        } else {
          setDependents((current) => current.filter((dependent) => dependent.id !== taskId));
        }
      }}
    />
  );
}

const MOCK_SCHEDULING_TASK: SchedulingPanelTask = {
  id: "task-weekly-review",
  title: "Prepare weekly review",
  status: "IN_PROGRESS",
};

const MOCK_SCHEDULING_BLOCKS: readonly TimeBlock[] = [
  {
    id: "time-block-weekly-planning",
    title: "Weekly planning",
    category: "Deep work",
    categoryColor: "blue",
    categoryIcon: "brain",
    date: "2026-08-24",
    startTime: "09:00",
    endTime: "10:00",
    status: "SCHEDULED",
    taskId: MOCK_SCHEDULING_TASK.id,
    taskTitle: MOCK_SCHEDULING_TASK.title,
  },
  {
    id: "time-block-reading",
    title: "Reading",
    category: "Learning",
    categoryColor: "green",
    categoryIcon: "book-open",
    date: "2026-08-24",
    startTime: "15:00",
    endTime: "15:30",
    status: "SCHEDULED",
    taskId: MOCK_SCHEDULING_TASK.id,
    taskTitle: MOCK_SCHEDULING_TASK.title,
  },
];

export function SchedulingPanelDemo({
  state = "ready",
}: {
  readonly state?: "ready" | "conflict" | "active" | "empty" | "read-only" | "error" | "loading";
}) {
  const [lastAction, setLastAction] = useState("No action yet");

  if (state === "loading") {
    return <SchedulingPanel task={MOCK_SCHEDULING_TASK} loading />;
  }
  if (state === "error") {
    return (
      <SchedulingPanel
        task={MOCK_SCHEDULING_TASK}
        error="Task details are still available."
        onRetry={() => setLastAction("Retried scheduling details")}
      />
    );
  }

  const timeBlocks =
    state === "empty"
      ? []
      : state === "conflict"
        ? [
            {
              ...MOCK_SCHEDULING_BLOCKS[0]!,
              hasConflict: true,
              conflictDescriptions: ["Overlaps with Reading (09:30 – 10:15)"],
            },
          ]
        : MOCK_SCHEDULING_BLOCKS;

  return (
    <div className="specimen-stack" style={{ width: "100%" }}>
      <Text tone="secondary" size="xs">
        {lastAction}
      </Text>
      <SchedulingPanel
        task={MOCK_SCHEDULING_TASK}
        timeBlocks={timeBlocks}
        spentMinutes={95}
        locale="en-IN"
        timeZone="Asia/Kolkata"
        now={new Date("2026-08-23T12:00:00Z")}
        readOnly={state === "read-only"}
        {...(state === "read-only"
          ? {
              readOnlyReason:
                "You can view this schedule, but you don't have permission to change it.",
            }
          : {})}
        {...(state === "active"
          ? {
              activeFocusSession: {
                id: "focus-weekly-review",
                taskId: MOCK_SCHEDULING_TASK.id,
                timeBlockId: "time-block-weekly-planning",
                status: "running" as const,
                taskTitle: MOCK_SCHEDULING_TASK.title,
              },
              onOpenActiveFocus: () => setLastAction("Opened active focus"),
            }
          : {})}
        onSchedule={() => setLastAction("Opened scheduling")}
        onResolveScheduleConflict={() => setLastAction("Opened conflict resolution")}
        onStartFocus={(timeBlockId) =>
          setLastAction(
            timeBlockId ? `Started focus from ${timeBlockId}` : "Started focus from this Task",
          )
        }
      />
    </div>
  );
}

export function TaskFormDemo({
  presentation = "full",
}: {
  readonly presentation?: "full" | "quick-add";
}) {
  const [open, setOpen] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);

  return (
    <div className="specimen-stack">
      <Button type="button" onClick={() => setOpen(true)}>
        {presentation === "quick-add" ? "Open Quick Add task" : "Open task form"}
      </Button>
      {submittedTitle ? <Text tone="success">Submitted: {submittedTitle}</Text> : null}
      <TaskForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(data) => {
          setSubmittedTitle(data.title);
          setOpen(false);
        }}
        presentation={presentation}
        timeZone="Asia/Kolkata"
        locale="en-IN"
        projects={[
          { id: "portfolio-refresh", name: "Portfolio refresh" },
          { id: "home-records-cleanup", name: "Home records cleanup" },
        ]}
        labels={[
          { id: "deep-work", name: "Deep work" },
          { id: "weekly-planning", name: "Weekly planning" },
        ]}
      />
    </div>
  );
}

export function TaskSummaryMetricsDemo({
  state = "ready",
}: {
  readonly state?: TaskSummaryMetricsStatus["type"];
}) {
  const [preset, setPreset] = useState<TaskFilterPresetId>("ALL");
  const [retryCount, setRetryCount] = useState(0);
  const status: TaskSummaryMetricsStatus =
    state === "ready"
      ? {
          type: "ready",
          counts: { total: 24, toDo: 8, inProgress: 5, done: 7, blocked: 3, overdue: 1 },
        }
      : state === "error"
        ? {
            type: "error",
            message: "Couldn't load task counts.",
            onRetry: () => setRetryCount((count) => count + 1),
          }
        : { type: state };
  const presetLabel = TASK_FILTER_PRESETS.find((item) => item.id === preset)?.label ?? "Custom";

  return (
    <div className="specimen-stack">
      <Text tone="secondary" size="xs">
        Active preset: {presetLabel}
        {retryCount > 0 ? `; retries: ${retryCount}` : ""}
      </Text>
      <TaskSummaryMetrics status={status} activePreset={preset} onSelectPreset={setPreset} />
    </div>
  );
}

export function ProjectFormDemo() {
  const [open, setOpen] = useState(false);
  const [submittedData, setSubmittedData] = useState<string | null>(null);

  return (
    <div className="specimen-stack">
      <Button type="button" onClick={() => setOpen(true)}>
        Open ProjectForm Dialog
      </Button>
      {submittedData ? <Text tone="success">Submitted: {submittedData}</Text> : null}
      <ProjectForm
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={(data) => {
          setSubmittedData(JSON.stringify(data));
          setOpen(false);
        }}
      />
    </div>
  );
}

export function ProjectSummaryMetricsDemo() {
  const [filter, setFilter] = useState<ProjectFilterCategory>("ALL");

  return (
    <div className="specimen-stack">
      <Text tone="secondary" size="xs">
        Active filter: {filter}
      </Text>
      <ProjectSummaryMetrics
        counts={{
          total: 15,
          active: 8,
          completed: 5,
          onHold: 2,
          atRisk: 3,
          averageProgress: 72,
        }}
        activeFilter={filter}
        onSelectFilter={setFilter}
      />
    </div>
  );
}

export function ProjectDetailsHeaderDemo() {
  const now = new Date("2026-08-20T17:00:00Z");

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Active Project Header
          </Text>
        </div>
        <ProjectDetailsHeader
          project={MOCK_PROJECT_READY}
          ownerName="Sarah Connor"
          estimatedHours={40}
          now={now}
          onAddTask={() => alert("Add task")}
          onEdit={() => alert("Edit project")}
          onArchive={() => alert("Archive project")}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Archived Project Header
          </Text>
        </div>
        <ProjectDetailsHeader
          project={MOCK_PROJECT_ARCHIVED}
          ownerName="Sarah Connor"
          estimatedHours={24}
          now={now}
          onRestore={() => alert("Restore project")}
          onDelete={() => alert("Delete project")}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Loading Header
          </Text>
        </div>
        <ProjectDetailsHeader loading />
      </div>
    </div>
  );
}

export function ProjectOverviewDemo() {
  const now = new Date("2026-08-20T17:00:00Z");

  const sampleTasks: readonly ProjectOverviewTask[] = [
    {
      id: "task-101",
      title: "Design token audit & accessibility checks",
      status: "IN_PROGRESS",
      priority: "P1",
      dueDate: "2026-08-25",
      assigneeName: "Sarah Connor",
    },
    {
      id: "task-102",
      title: "Backend Flyway baseline migration",
      status: "COMPLETED",
      priority: "P2",
      dueDate: "2026-08-15",
      assigneeName: "John Doe",
    },
  ];

  const sampleActivity = [
    {
      id: "act-101",
      actorName: "Sarah Connor",
      action: "updated health to",
      object: { label: "On track", href: "#health" },
      createdAt: "2026-08-20T14:30:00Z",
    },
  ];

  const statusData = [
    { id: "status-completed", label: "Completed", value: 4 },
    { id: "status-in-progress", label: "In progress", value: 4 },
    { id: "status-planned", label: "Planned", value: 2 },
  ];

  const priorityData = [
    { id: "p1", label: "P1 — High", value: 3 },
    { id: "p2", label: "P2 — Medium", value: 5 },
    { id: "p3", label: "P3 — Low", value: 2 },
  ];

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Populated Project Overview
          </Text>
        </div>
        <ProjectOverview
          project={MOCK_PROJECT_READY}
          ownerName="Sarah Connor"
          estimatedHours={40}
          actualHours={20}
          labels={["Frontend", "Core", "Phase 2"]}
          topTasks={sampleTasks}
          activityEvents={sampleActivity}
          statusBreakdown={statusData}
          priorityBreakdown={priorityData}
          now={now}
          locale="en-US"
          timeZone="UTC"
          onAddTask={() => alert("Add task")}
          onEditProject={() => alert("Edit project")}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Loading Overview
          </Text>
        </div>
        <ProjectOverview loading />
      </div>
    </div>
  );
}

export function ProjectTimelineDemo() {
  const now = new Date("2026-08-20T17:00:00Z");

  const [milestones, setMilestones] = useState<readonly Milestone[]>([
    {
      id: "m1",
      projectId: "p1",
      title: "Architecture & Design Baseline",
      date: "2026-08-10",
      status: "COMPLETED",
      ordering: 1,
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-10T15:00:00Z",
      version: 1,
    },
    {
      id: "m2",
      projectId: "p1",
      title: "Phase 1 Beta Milestone",
      date: "2026-08-18",
      status: "PLANNED",
      ordering: 2,
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-01T10:00:00Z",
      version: 1,
    },
    {
      id: "m3",
      projectId: "p1",
      title: "Final QA Gate",
      date: "2026-09-01",
      status: "PLANNED",
      ordering: 3,
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-01T10:00:00Z",
      version: 1,
    },
  ]);

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Interactive Project Timeline
          </Text>
        </div>
        <ProjectTimeline
          projectId="p1"
          milestones={milestones}
          now={now}
          locale="en-US"
          timeZone="UTC"
          onAddMilestone={(data) => {
            const newM: Milestone = {
              id: `m-${Date.now()}`,
              projectId: "p1",
              title: data.title,
              date: data.date ?? null,
              status: data.status,
              ordering: data.ordering ?? milestones.length + 1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              version: 1,
            };
            setMilestones((prev) => [...prev, newM]);
          }}
          onUpdateMilestone={(id, data) => {
            setMilestones((prev) =>
              prev.map((m) =>
                m.id === id
                  ? {
                      ...m,
                      title: data.title,
                      date: data.date ?? null,
                      status: data.status,
                      ordering: data.ordering ?? m.ordering,
                    }
                  : m,
              ),
            );
          }}
          onStatusChange={(id, status) => {
            setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, status } : m)));
          }}
          onDeleteMilestone={(id) => {
            setMilestones((prev) => prev.filter((m) => m.id !== id));
          }}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Empty Timeline
          </Text>
        </div>
        <ProjectTimeline milestones={[]} onAddMilestone={() => alert("Add milestone")} />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Loading Timeline
          </Text>
        </div>
        <ProjectTimeline loading />
      </div>
    </div>
  );
}

export function ProjectDetailsScreenDemo() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [activityFilter, setActivityFilter] = useState<ActivityTypeFilter>("ALL");

  const sampleMilestones: readonly Milestone[] = [
    {
      id: "m1",
      projectId: "p1",
      title: "Architecture & Design Baseline",
      date: "2026-08-10",
      status: "COMPLETED",
      ordering: 1,
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-10T15:00:00Z",
      version: 1,
    },
    {
      id: "m2",
      projectId: "p1",
      title: "Phase 1 Beta Milestone",
      date: "2026-08-18",
      status: "PLANNED",
      ordering: 2,
      createdAt: "2026-08-01T10:00:00Z",
      updatedAt: "2026-08-01T10:00:00Z",
      version: 1,
    },
  ];

  const sampleProject: Project = {
    id: "p1",
    name: "Website Redesign v2",
    description: "Redesigning main marketing site and user dashboard.",
    status: "ACTIVE",
    priority: "P1",
    health: "ON_TRACK",
    color: "blue",
    icon: "layout",
    startDate: "2026-08-01",
    deadlineDate: "2026-09-30",
    completedTasksCount: 5,
    totalTasksCount: 10,
    updatedAt: "2026-08-20T10:00:00Z",
    version: 2,
  };
  const activityEvents = [
    {
      id: "project-activity-updated",
      type: "PROJECT" as const,
      actorName: "You",
      action: "updated",
      object: { label: sampleProject.name, href: `/life-os/app/projects/${sampleProject.id}` },
      createdAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "project-activity-task",
      type: "TASK" as const,
      actorName: "You",
      action: "created",
      object: { label: "Prepare weekly review", href: "/life-os/app/tasks/task-weekly-review" },
      createdAt: "2026-08-20T09:00:00Z",
    },
  ];
  const filteredActivityEvents = activityEvents.filter(
    (event) => activityFilter === "ALL" || event.type === activityFilter,
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-6)" }}>
      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Interactive ProjectDetailsScreen (Tab: {selectedTab})
          </Text>
        </div>
        <ProjectDetailsScreen
          project={sampleProject}
          milestones={sampleMilestones}
          selectedTab={selectedTab}
          onTabChange={setSelectedTab}
          ownerName="Partha Hudati"
          estimatedHours={40}
          actualHours={18}
          labels={["Design", "Frontend", "Q3-Goal"]}
          activityEvents={activityEvents}
          activityTabEvents={filteredActivityEvents}
          activityCount={22}
          activityPage={1}
          activityPageSize={20}
          activityTotal={22}
          onActivityPageChange={() => undefined}
          activityFilter={activityFilter}
          onActivityFilterChange={setActivityFilter}
          activityEmptyTitle={
            activityFilter === "ALL"
              ? "No activity recorded"
              : `No ${activityFilter.toLowerCase()} changes on this page`
          }
          now={new Date("2026-08-20T12:00:00Z")}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Loading Screen State
          </Text>
        </div>
        <ProjectDetailsScreen loading />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Not Found 404 Screen State
          </Text>
        </div>
        <ProjectDetailsScreen notFound />
      </div>
    </div>
  );
}

const MOCK_TIME_BLOCK_SCHEDULED: TimeBlock = {
  id: "tb-demo-1",
  title: "Deep Work: Architecture Spec",
  category: "Deep work",
  categoryColor: "blue",
  categoryIcon: "brain",
  date: "2026-08-21",
  startTime: "09:00",
  endTime: "10:30",
  status: "SCHEDULED",
  projectName: "LifeOS Core",
  taskTitle: "Write OpenAPI schema",
};

const MOCK_TIME_BLOCK_CURRENT: TimeBlock = {
  id: "tb-demo-2",
  title: "Team Architecture Sync",
  category: "Meeting",
  categoryColor: "purple",
  categoryIcon: "users",
  date: "2026-08-21",
  startTime: "11:00",
  endTime: "12:00",
  status: "IN_PROGRESS",
  isCurrent: true,
  projectName: "LifeOS Core",
};

const MOCK_TIME_BLOCK_COMPLETED: TimeBlock = {
  id: "tb-demo-3",
  title: "Morning Routine & Planning",
  category: "Personal",
  categoryColor: "green",
  categoryIcon: "heart",
  date: "2026-08-21",
  startTime: "08:00",
  endTime: "08:45",
  status: "COMPLETED",
  completed: true,
};

const MOCK_TIME_BLOCK_CONFLICT: TimeBlock = {
  id: "tb-demo-4",
  title: "Sprint Retrospective",
  category: "Meeting",
  categoryColor: "amber",
  categoryIcon: "users",
  date: "2026-08-21",
  startTime: "11:30",
  endTime: "12:30",
  status: "SCHEDULED",
  hasConflict: true,
  conflictDescriptions: ["Overlaps with Team Architecture Sync (11:00 – 12:00)"],
};

export function TimeBlockRowDemo() {
  const now = new Date("2026-08-21T11:15:00Z");

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Scheduled TimeBlockRow (With Project & Task)
          </Text>
        </div>
        <TimeBlockRow
          timeBlock={MOCK_TIME_BLOCK_SCHEDULED}
          onStartFocus={() => alert("Start focus clicked")}
          onComplete={() => alert("Complete clicked")}
          onEdit={() => alert("Edit clicked")}
          onDuplicate={() => alert("Duplicate clicked")}
          onDelete={() => alert("Delete clicked")}
          now={now}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Current Active TimeBlockRow
          </Text>
        </div>
        <TimeBlockRow
          timeBlock={MOCK_TIME_BLOCK_CURRENT}
          onStartFocus={() => alert("Start focus clicked")}
          onComplete={() => alert("Complete clicked")}
          onEdit={() => alert("Edit clicked")}
          now={now}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Completed TimeBlockRow
          </Text>
        </div>
        <TimeBlockRow timeBlock={MOCK_TIME_BLOCK_COMPLETED} now={now} />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Conflict Warning TimeBlockRow
          </Text>
        </div>
        <TimeBlockRow
          timeBlock={MOCK_TIME_BLOCK_CONFLICT}
          onStartFocus={() => alert("Start focus clicked")}
          onEdit={() => alert("Edit clicked")}
          now={now}
        />
      </div>

      <div>
        <div style={{ marginBottom: "var(--lifeos-space-2)" }}>
          <Text tone="secondary" size="xs">
            Loading Skeleton State
          </Text>
        </div>
        <TimeBlockRow loading />
      </div>
    </div>
  );
}

export function TimeBlockFormDemo() {
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);

  return (
    <div className="specimen-stack" style={{ display: "flex", gap: "var(--lifeos-space-4)" }}>
      <Button onClick={() => setOpenCreate(true)}>Open Create TimeBlockForm</Button>
      <Button variant="secondary" onClick={() => setOpenEdit(true)}>
        Open Edit TimeBlockForm
      </Button>

      <TimeBlockForm
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onSubmit={(data) => {
          alert(`Submitted time block: ${data.title}`);
          setOpenCreate(false);
        }}
        mode="create"
      />

      <TimeBlockForm
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        onSubmit={(data) => {
          alert(`Saved changes for: ${data.title}`);
          setOpenEdit(false);
        }}
        mode="edit"
        initialValues={MOCK_TIME_BLOCK_SCHEDULED}
      />
    </div>
  );
}

export function DayTimelineDemo() {
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [viewMode, setViewMode] = useState<"auto" | "grid" | "list">("auto");
  const fixedNow = new Date("2026-08-21T11:15:00Z");

  const mockBlocks: TimeBlock[] = [
    MOCK_TIME_BLOCK_COMPLETED,
    MOCK_TIME_BLOCK_SCHEDULED,
    MOCK_TIME_BLOCK_CURRENT,
    MOCK_TIME_BLOCK_CONFLICT,
  ];

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <DayTimeline
        blocks={mockBlocks}
        date="2026-08-21"
        now={fixedNow}
        timeZone="UTC"
        density={density}
        onDensityChange={setDensity}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onCreateBlock={(start, end) => alert(`Create block from ${start} to ${end}`)}
        onSelectBlock={(b) => alert(`Selected block: ${b.title}`)}
        onMoveBlock={(id, start, end) => alert(`Moved block ${id} to ${start}–${end}`)}
        onResizeBlock={(id, end) => alert(`Resized block ${id} end to ${end}`)}
      />
    </div>
  );
}

export function TimeSummaryDemo() {
  const fixedNow = new Date("2026-08-24T14:30:00Z");
  const upcomingBlocks: TimeBlock[] = [
    {
      id: "tb-demo-1",
      title: "Architecture Review & Refactoring",
      category: "Focus",
      date: "2026-08-24",
      startTime: "15:00",
      endTime: "16:30",
      status: "SCHEDULED",
    },
    {
      id: "tb-demo-2",
      title: "Evening Reset & Planning",
      category: "Personal",
      date: "2026-08-24",
      startTime: "17:00",
      endTime: "17:30",
      status: "SCHEDULED",
    },
  ];

  return (
    <div
      className="specimen-stack"
      style={{ display: "flex", flexDirection: "column", gap: "var(--lifeos-space-4)" }}
    >
      <TimeSummary
        metricsStatus={{
          type: "ready",
          counts: {
            focusMinutes: 225,
            breakMinutes: 45,
            personalMinutes: 135,
            unscheduledMinutes: 75,
          },
        }}
        breakdownStatus="ready"
        categories={[
          { name: "Focus", minutes: 225, colorName: "blue" },
          { name: "Break", minutes: 45, colorName: "teal" },
          { name: "Personal", minutes: 135, colorName: "purple" },
          { name: "Unscheduled", minutes: 75, colorName: "amber" },
        ]}
        goalStatus="ready"
        targetMinutes={240}
        actualMinutes={225}
        upcomingStatus="ready"
        upcomingBlocks={upcomingBlocks}
        now={fixedNow}
        timeZone="UTC"
        onStartFocus={(b) => alert(`Start focus session for: ${b?.title ?? "current"}`)}
        onCompleteBlock={(b) => alert(`Complete block: ${b.title}`)}
        onEditBlock={(b) => alert(`Edit block: ${b.title}`)}
        onCreateBlock={() => alert("Create new block")}
        onEditGoal={() => alert("Edit focus goal target")}
      />
    </div>
  );
}

export {
  SprintCardDemo,
  SprintProgressCapacityDemo,
  SprintTaskCommitmentListDemo,
  SprintScopeChangeHistoryDemo,
  SprintFormDialogDemo,
  SprintRetrospectiveDialogDemo,
} from "./SprintDemos";

export { TimeBlocksScreenDemo } from "./TimeBlocksScreenDemos";
