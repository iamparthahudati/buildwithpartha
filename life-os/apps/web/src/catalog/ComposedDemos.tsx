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
