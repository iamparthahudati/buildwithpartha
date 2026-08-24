import { TextInput } from "@components/ui";
import { FormField } from "@components/forms";

import {
  ComboboxMultiCreateDemo,
  ComboboxSingleDemo,
  CreateTaskFormDemo,
  DateRangeFieldDemo,
  DateRangeFieldInvalidOrderDemo,
  DateTimeFieldDemo,
  ColorIconPickerDemo,
  DateTimeFieldFoldDemo,
  DateTimeFieldGapDemo,
  DurationFieldBoundedDemo,
  DurationFieldDemo,
  SearchFieldDebouncedDemo,
  SearchFieldSubmitDemo,
  ProjectRowDemo,
  ProjectCardDemo,
  TaskRowDemo,
  TaskCardDemo,
  TaskDetailsHeaderDemo,
  SubtaskChecklistDemo,
  DependencyEditorDemo,
  SchedulingPanelDemo,
  TaskFormDemo,
  TaskSummaryMetricsDemo,
  ProjectDetailsHeaderDemo,
  ProjectDetailsScreenDemo,
  ProjectOverviewDemo,
  ProjectTimelineDemo,
  ProjectFormDemo,
  ProjectSummaryMetricsDemo,
  SprintCardDemo,
  SprintProgressCapacityDemo,
  SprintTaskCommitmentListDemo,
  SprintScopeChangeHistoryDemo,
  SprintFormDialogDemo,
  SprintRetrospectiveDialogDemo,
  TimeBlockRowDemo,
  TimeBlockFormDemo,
  DayTimelineDemo,
  TimeSummaryDemo,
  TimeBlocksScreenDemo,
  WeekStripReadyDemo,
  WeekStripLoadingDemo,
  WeekCapacitySummaryReadyDemo,
  WeekCapacitySummaryOvercapacityDemo,
  WeekCapacitySummaryLoadingDemo,
} from "./ComposedDemos";

import { ProjectsScreenDemo } from "./ProjectsScreenDemos";
import { TasksScreenDemo } from "./TasksScreenDemos";
import { TaskDetailsScreenDemo, TaskDetailsSheetDemo } from "./TaskDetailsDemos";
import {
  CalendarEventDemo,
  CalendarFilterDemo,
  CalendarGridsDemo,
  CalendarHeaderDemo,
} from "./CalendarDemos";
import type { CatalogEntry } from "./registry";

/* Composed-component entries (LOS-0401 onward). */

export const COMPOSED_CATALOG_ENTRIES: readonly CatalogEntry[] = Object.freeze([
  {
    id: "form-field",
    name: "FormField and FormErrorSummary",
    group: "Composed",
    summary:
      "Composes label, control, required/optional wording and error-summary linkage over an atom. FormField hands its atom a render prop rather than cloning it, so the atom's own required label prop stays a real, checked type.",
    states: [
      {
        id: "form-field-required-optional",
        name: "Required and optional",
        description: "Required fields carry no mark; an optional field says so in its own label.",
        render: () => (
          <div className="specimen-stack">
            <FormField name="title" label="Task title">
              {(field) => <TextInput {...field} />}
            </FormField>
            <FormField name="notes" label="Notes" required={false}>
              {(field) => <TextInput {...field} />}
            </FormField>
          </div>
        ),
      },
      {
        id: "form-field-error",
        name: "Error",
        description: "The error reaches the composed atom exactly as it does when set directly.",
        render: () => (
          <FormField name="title" label="Task title" error="Enter a task title.">
            {(field) => <TextInput {...field} />}
          </FormField>
        ),
      },
      {
        id: "form-error-summary-submit",
        name: "Submit with the error summary",
        description:
          "The summary appears and takes keyboard focus only once — after a failed submit — never while the fields are still being filled in.",
        render: () => <CreateTaskFormDemo />,
      },
    ],
  },
  {
    id: "search-field",
    name: "SearchField",
    group: "Composed",
    summary:
      "A TextInput composed with when-to-search timing, a shortcut key, a loading announcement and a recent/no-results panel. A control that needs keyboard-navigable suggestions is Combobox instead.",
    states: [
      {
        id: "search-field-debounced",
        name: "Debounced, with recent searches",
        description:
          'Searches automatically after a pause; press "/" anywhere on this page to focus it.',
        render: () => <SearchFieldDebouncedDemo />,
      },
      {
        id: "search-field-submit",
        name: "Submit mode, with a result",
        description: "Searches only on Enter — typing alone never triggers it.",
        render: () => <SearchFieldSubmitDemo />,
      },
    ],
  },
  {
    id: "combobox",
    name: "Combobox",
    group: "Composed",
    summary:
      "Accessible single/multi-select built on a real text input following the ARIA 1.2 combobox-with-listbox pattern: focus stays on the input, and aria-activedescendant tracks the keyboard's current option. Reach for this only where Select cannot do the job.",
    states: [
      {
        id: "combobox-single",
        name: "Single select",
        description: "Arrow keys move the active option; Enter selects and closes the listbox.",
        render: () => <ComboboxSingleDemo />,
      },
      {
        id: "combobox-multi-create",
        name: "Multi-select with create",
        description:
          "Selecting keeps the listbox open. Typing a name with no match offers to create it.",
        render: () => <ComboboxMultiCreateDemo />,
      },
    ],
  },
  {
    id: "date-range-field",
    name: "DateRangeField",
    group: "Composed",
    summary:
      "Two DateInputs under one fieldset and legend. Each side constrains the other's native picker, and an end date before the start is named automatically, without the caller supplying anything.",
    states: [
      {
        id: "date-range-field-presets",
        name: "With presets",
        description: "Every preset is computed from today in the field's own timezone.",
        render: () => <DateRangeFieldDemo />,
      },
      {
        id: "date-range-field-invalid-order",
        name: "Invalid order",
        description: "The built-in check, not a message the caller had to write.",
        render: () => <DateRangeFieldInvalidOrderDemo />,
      },
    ],
  },
  {
    id: "datetime-field",
    name: "DateTimeField",
    group: "Composed",
    summary:
      "A DateInput and a TimeInput under one fieldset and legend. The timezone is required input, not a label: it is what lets the field check whether the chosen date and time name a real moment at all.",
    states: [
      {
        id: "datetime-field-default",
        name: "Ordinary value",
        description: "An unremarkable date and time produces no extra message.",
        render: () => <DateTimeFieldDemo />,
      },
      {
        id: "datetime-field-gap",
        name: "Daylight-saving gap",
        description:
          "02:30 on 8 March 2026 in America/New_York is skipped when clocks spring forward — an error, because there is no valid instant to offer.",
        render: () => <DateTimeFieldGapDemo />,
      },
      {
        id: "datetime-field-fold",
        name: "Daylight-saving fold",
        description:
          "01:30 on 1 November 2026 in America/New_York happens twice when clocks fall back — a warning, not an error, resolved to the earlier occurrence.",
        render: () => <DateTimeFieldFoldDemo />,
      },
    ],
  },
  {
    id: "duration-field",
    name: "DurationField",
    group: "Composed",
    summary:
      "Hours and minutes entry over one canonical minute total. The two inputs are derived fresh from the total on every render, which is what makes an overflowing minutes entry normalize into whole hours automatically. Bounds are reported, never silently rewritten.",
    states: [
      {
        id: "duration-field-default",
        name: "Default",
        description: "The readable summary appears once there is a value, and disappears with it.",
        render: () => <DurationFieldDemo />,
      },
      {
        id: "duration-field-bounds",
        name: "Out of bounds",
        description:
          "The message names the correction; the typed value is preserved rather than replaced.",
        render: () => <DurationFieldBoundedDemo />,
      },
    ],
  },
  {
    id: "color-icon-picker",
    name: "ColorIconPicker",
    group: "Composed",
    summary:
      "Two real native radio groups reusing the eight frozen chart tokens and a small curated icon set. Arrow-key movement and the roving tab stop come from the browser; the stored value is always a name, never a token or hex.",
    states: [
      {
        id: "color-icon-picker-default",
        name: "Default",
        description:
          "Every swatch is independently proven to clear AA as a solid fill under the white preview icon.",
        render: () => <ColorIconPickerDemo />,
      },
    ],
  },
  {
    id: "project-row",
    name: "ProjectRow",
    group: "Composed",
    summary:
      "A responsive row item representing a Project, highlighting name, description, priority, health, status, progress, deadline, relative updated time, and actions menu.",
    states: [
      {
        id: "project-row-default",
        name: "Default",
        description: "Renders rows in active, overdue, archived, and loading states.",
        render: () => <ProjectRowDemo />,
      },
    ],
  },
  {
    id: "project-card",
    name: "ProjectCard",
    group: "Composed",
    summary:
      "A responsive card item representing a Project, displaying name, description, priority, health, status, progress, deadline, relative updated time, and actions menu in a grid layout.",
    states: [
      {
        id: "project-card-default",
        name: "Default",
        description: "Renders cards in active, overdue, archived, and loading states.",
        render: () => <ProjectCardDemo />,
      },
    ],
  },
  {
    id: "task-row",
    name: "TaskRow",
    group: "Composed",
    summary:
      "A responsive Task list row with controlled selection, Project context, priority and status, timezone-aware due text, progress, comments, MIT designation, lifecycle states, and an accessible action menu.",
    states: [
      {
        id: "task-row-states",
        name: "Lifecycle and loading states",
        description: "Active MIT, overdue and blocked, done, archived, and loading rows.",
        render: () => <TaskRowDemo />,
      },
    ],
  },
  {
    id: "task-card",
    name: "TaskCard",
    group: "Composed",
    summary:
      "The card counterpart to TaskRow, preserving the same controlled selection, metadata, state, progress, and action contracts in a compact responsive layout.",
    states: [
      {
        id: "task-card-states",
        name: "Lifecycle and loading states",
        description: "Active MIT, overdue and blocked, done, archived, and loading cards.",
        render: () => <TaskCardDemo />,
      },
    ],
  },
  {
    id: "task-form",
    name: "TaskForm",
    group: "Composed",
    summary:
      "A create/edit Task dialog with canonical status and priority, timezone-safe due entry, Estimate, progress, Labels, dated MIT selection, dirty protection, version-conflict recovery, and a compact Quick Add presentation.",
    states: [
      {
        id: "task-form-full",
        name: "Full form",
        description: "All Task fields with progressive advanced details.",
        render: () => <TaskFormDemo />,
      },
      {
        id: "task-form-quick-add",
        name: "Quick Add",
        description:
          "Title, optional Project, and due time first; all details remain one action away.",
        render: () => <TaskFormDemo presentation="quick-add" />,
      },
    ],
  },
  {
    id: "task-details-header",
    name: "TaskDetailsHeader",
    group: "Composed",
    summary:
      "A responsive Task details header with deep-link breadcrumbs, canonical status and priority, Project, due date, Estimate, Time spent, progress, Labels, lifecycle-valid actions, and explicit archived, deleted, conflict, and loading states.",
    states: [
      {
        id: "task-details-header-states",
        name: "Ready and lifecycle states",
        description: "Active, conflict, archived, deleted, and loading Task header specimens.",
        render: () => <TaskDetailsHeaderDemo />,
      },
    ],
  },
  {
    id: "subtask-checklist",
    name: "SubtaskChecklist",
    group: "Composed",
    summary:
      "An ordered Subtask checklist with exact progress, add/edit/toggle/delete actions, button and Alt+Arrow keyboard reordering, isolated pending/failure states, and an explicit boundary between 100% checklist progress and parent Task completion.",
    states: [
      {
        id: "subtask-checklist-ready",
        name: "Interactive checklist",
        description: "Add, edit, reorder, toggle, and delete Subtasks with controlled data.",
        render: () => <SubtaskChecklistDemo />,
      },
      {
        id: "subtask-checklist-pending-partial",
        name: "Pending and partial failure",
        description:
          "One pending Subtask and one failed reorder stay isolated while the rest remain available.",
        render: () => <SubtaskChecklistDemo state="partial" />,
      },
      {
        id: "subtask-checklist-empty",
        name: "First-use empty",
        description: "The value of Subtasks is explained beside the available add control.",
        render: () => <SubtaskChecklistDemo state="empty" />,
      },
      {
        id: "subtask-checklist-read-only",
        name: "Permission read-only",
        description: "Confirmed Subtasks stay visible while every mutation is unavailable.",
        render: () => <SubtaskChecklistDemo state="read-only" />,
      },
      {
        id: "subtask-checklist-error",
        name: "Load error",
        description:
          "The failed checklist is isolated while the surrounding Task remains available.",
        render: () => <SubtaskChecklistDemo state="error" />,
      },
      {
        id: "subtask-checklist-loading",
        name: "Loading",
        description: "The checklist reserves its header, progress, and row layout while loading.",
        render: () => <SubtaskChecklistDemo state="loading" />,
      },
    ],
  },
  {
    id: "dependency-editor",
    name: "DependencyEditor",
    group: "Composed",
    summary:
      "A directional Task dependency editor with blocker search and selection, blocker/dependent lists, direct completion navigation, cycle/self explanations, isolated mutation recovery, and a full-screen mobile add dialog.",
    states: [
      {
        id: "dependency-editor-ready",
        name: "Interactive dependencies",
        description:
          "Search for blockers, navigate to unresolved Tasks, and unlink either relationship direction.",
        render: () => <DependencyEditorDemo />,
      },
      {
        id: "dependency-editor-cycle",
        name: "Cycle explanation",
        description:
          "Open Add blocker and select Update learning plan to see the dependency-loop explanation.",
        render: () => <DependencyEditorDemo state="cycle" />,
      },
      {
        id: "dependency-editor-pending-partial",
        name: "Pending and partial failure",
        description:
          "One unlink is pending while a conflict stays isolated to a different relationship.",
        render: () => <DependencyEditorDemo state="partial" />,
      },
      {
        id: "dependency-editor-empty",
        name: "First-use empty",
        description: "Both relationship directions explain their independent empty state.",
        render: () => <DependencyEditorDemo state="empty" />,
      },
      {
        id: "dependency-editor-read-only",
        name: "Permission read-only",
        description: "Confirmed relationships stay visible while every mutation is unavailable.",
        render: () => <DependencyEditorDemo state="read-only" />,
      },
      {
        id: "dependency-editor-error",
        name: "Load error",
        description:
          "A failed dependency region is isolated while the surrounding Task remains available.",
        render: () => <DependencyEditorDemo state="error" />,
      },
      {
        id: "dependency-editor-loading",
        name: "Loading",
        description: "The editor reserves its relationship headings and rows while loading.",
        render: () => <DependencyEditorDemo state="loading" />,
      },
    ],
  },
  {
    id: "scheduling-panel",
    name: "SchedulingPanel",
    group: "Composed",
    summary:
      "A controlled Task scheduling and focus panel that reuses linked TimeBlockRows, shows confirmed Focus Session time, delegates schedule and Start focus actions, and prevents duplicate active sessions.",
    states: [
      {
        id: "scheduling-panel-ready",
        name: "Linked schedule and focus",
        description:
          "Confirmed time, linked Time Blocks, Schedule, and Task/Time Block Start focus actions remain in one responsive region.",
        render: () => <SchedulingPanelDemo />,
      },
      {
        id: "scheduling-panel-conflict",
        name: "Schedule conflict",
        description:
          "The shared Time Block conflict detail stays visible with an explicit path to the scheduling service's resolution flow.",
        render: () => <SchedulingPanelDemo state="conflict" />,
      },
      {
        id: "scheduling-panel-active-focus",
        name: "Active Focus Session",
        description:
          "An existing shared Focus Session replaces every duplicate Start focus action with one Open focus path.",
        render: () => <SchedulingPanelDemo state="active" />,
      },
      {
        id: "scheduling-panel-empty",
        name: "No linked Time Blocks",
        description: "The first schedule action is available from the truthful first-use state.",
        render: () => <SchedulingPanelDemo state="empty" />,
      },
      {
        id: "scheduling-panel-read-only",
        name: "Permission read-only",
        description:
          "Confirmed schedule and time remain visible while every mutation is unavailable.",
        render: () => <SchedulingPanelDemo state="read-only" />,
      },
      {
        id: "scheduling-panel-error",
        name: "Load error",
        description:
          "The failed region names that the rest of the Task remains available and offers retry.",
        render: () => <SchedulingPanelDemo state="error" />,
      },
      {
        id: "scheduling-panel-loading",
        name: "Loading",
        description: "The panel reserves its summary and linked-Time-Block layout while loading.",
        render: () => <SchedulingPanelDemo state="loading" />,
      },
    ],
  },
  {
    id: "task-summary-metrics",
    name: "TaskSummaryMetrics",
    group: "Composed",
    summary:
      "Six controlled Task counts with accessible values and actions for URL-compatible All, To Do, In progress, Done, Blocked, and Overdue filter presets.",
    states: [
      {
        id: "task-summary-metrics-ready",
        name: "Ready and interactive",
        description:
          "Every action exposes its exact Task filter name and the selected preset uses aria-pressed as well as a visible treatment.",
        render: () => <TaskSummaryMetricsDemo />,
      },
      {
        id: "task-summary-metrics-loading",
        name: "Loading",
        description: "All six labels remain visible while their values load.",
        render: () => <TaskSummaryMetricsDemo state="loading" />,
      },
      {
        id: "task-summary-metrics-empty",
        name: "No tasks",
        description: "A new Account sees truthful zero values without losing the filter actions.",
        render: () => <TaskSummaryMetricsDemo state="empty" />,
      },
      {
        id: "task-summary-metrics-error",
        name: "Error and retry",
        description:
          "The shared summary failure is named on every affected value with one retry action.",
        render: () => <TaskSummaryMetricsDemo state="error" />,
      },
    ],
  },
  {
    id: "tasks-screen",
    name: "TasksScreen",
    group: "Composed",
    summary:
      "Full Tasks screen with header/add, summary presets, tabs, search/filters/sort/view, DataTable and cards, bulk actions, pagination, detail selection, and loading/empty/error/partial-failure states.",
    states: [
      {
        id: "tasks-screen-default",
        name: "Default",
        description:
          "Tasks screen with populated, first-use, loading, error, and partial bulk-failure specimens.",
        render: () => <TasksScreenDemo />,
      },
    ],
  },
  {
    id: "task-details-screen",
    name: "TaskDetailsScreen",
    group: "Composed",
    summary:
      "Task Details composition with responsive tabs and list-context sheet presentation, reusing the completed header, Subtask checklist, dependency editor, scheduling, comments, attachments, and activity components.",
    states: [
      {
        id: "task-details-screen-states",
        name: "Tabs and UX states",
        description:
          "Switch among populated, empty, partial, refreshing, offline, archived, deleted, loading, unavailable, and service-error states, then exercise every enabled tab.",
        render: () => <TaskDetailsScreenDemo />,
      },
      {
        id: "task-details-screen-sheet",
        name: "List-context sheet",
        description:
          "A trailing desktop sheet that becomes full-screen on mobile and restores focus to the originating Task control when closed.",
        render: () => <TaskDetailsSheetDemo />,
      },
    ],
  },
  {
    id: "project-details-header",
    name: "ProjectDetailsHeader",
    group: "Composed",
    summary:
      "A comprehensive project details header component displaying deep link breadcrumbs, identity, status, owner, priority, health, dates, estimate, task progress, primary/secondary actions, responsive wrapping, and archived state.",
    states: [
      {
        id: "project-details-header-default",
        name: "Default",
        description: "Renders project details header in active, archived, and loading states.",
        render: () => <ProjectDetailsHeaderDemo />,
      },
    ],
  },
  {
    id: "project-details-screen",
    name: "ProjectDetailsScreen",
    group: "Composed",
    summary:
      "Project Details composition with responsive tabs, Activity filtering, pagination, and accessible timestamps.",
    states: [
      {
        id: "project-details-screen-default",
        name: "Default",
        description: "Interactive Project Details tabs plus loading and unavailable states.",
        render: () => <ProjectDetailsScreenDemo />,
      },
    ],
  },
  {
    id: "project-overview",
    name: "ProjectOverview",
    group: "Composed",
    summary:
      "Comprehensive project overview component displaying progress/task/time/health summary cards, breakdown charts, top tasks list, about/labels metadata, and activity feed.",
    states: [
      {
        id: "project-overview-default",
        name: "Default",
        description: "Project overview with populated, loading, empty, and error UX states.",
        render: () => <ProjectOverviewDemo />,
      },
    ],
  },
  {
    id: "project-form",
    name: "ProjectForm",
    group: "Composed",
    summary:
      "A comprehensive project creation and edit dialog form with progressive disclosure, field validations, dirty state tracking, theme picker, and optimistic concurrency conflict handling.",
    states: [
      {
        id: "project-form-default",
        name: "Default",
        description: "Interactive project form dialog with basic and advanced options.",
        render: () => <ProjectFormDemo />,
      },
    ],
  },
  {
    id: "project-summary-metrics",
    name: "ProjectSummaryMetrics",
    group: "Composed",
    summary:
      "A responsive metric strip showing total, active, completed, on hold, at risk, and average progress metrics with interactive filter triggers.",
    states: [
      {
        id: "project-summary-metrics-default",
        name: "Default",
        description: "Interactive metric strip with active filter selection.",
        render: () => <ProjectSummaryMetricsDemo />,
      },
    ],
  },
  {
    id: "project-timeline",
    name: "ProjectTimeline",
    group: "Composed",
    summary:
      "Accessible project milestones and timeline view composing Timeline primitive, summary statistics, milestone add/edit dialog, status transitions, and deletion confirmation.",
    states: [
      {
        id: "project-timeline-default",
        name: "Default",
        description: "Project timeline in interactive, empty, and loading states.",
        render: () => <ProjectTimelineDemo />,
      },
    ],
  },
  {
    id: "projects-screen",
    name: "ProjectsScreen",
    group: "Composed",
    summary:
      "Full responsive Projects screen composition with header, metrics, search/filters/sort/view controls, cards/table view, detail panel, form dialog, and pagination.",
    states: [
      {
        id: "projects-screen-default",
        name: "Default",
        description:
          "Projects screen with interactive states (populated, first-use empty, loading, error).",
        render: () => <ProjectsScreenDemo />,
      },
    ],
  },
  {
    id: "sprint-components",
    name: "Sprint components (SprintCard, Progress & Capacity, Task Commitment List, Scope Change History, Form, Retrospective)",
    group: "Composed",
    summary:
      "Comprehensive sprint components (LOS-1002): SprintCard, SprintProgressCapacity, SprintTaskCommitmentList, SprintScopeChangeHistory, SprintFormDialog, and SprintRetrospectiveDialog.",
    states: [
      {
        id: "sprint-card-default",
        name: "SprintCard",
        description: "Sprint summary card with goal, date range, capacity, and action buttons.",
        render: () => <SprintCardDemo />,
      },
      {
        id: "sprint-progress-capacity-default",
        name: "SprintProgressCapacity",
        description: "Progress meter showing completed points and planned capacity utilization.",
        render: () => <SprintProgressCapacityDemo />,
      },
      {
        id: "sprint-task-commitment-list-default",
        name: "SprintTaskCommitmentList",
        description:
          "List of committed tasks with status toggle, points, and scope addition badges.",
        render: () => <SprintTaskCommitmentListDemo />,
      },
      {
        id: "sprint-scope-change-history-default",
        name: "SprintScopeChangeHistory",
        description: "Timeline log of scope changes after sprint start.",
        render: () => <SprintScopeChangeHistoryDemo />,
      },
      {
        id: "sprint-form-dialog-default",
        name: "SprintFormDialog",
        description: "Create/edit sprint form dialog with validation and date bounds checking.",
        render: () => <SprintFormDialogDemo />,
      },
      {
        id: "sprint-retrospective-dialog-default",
        name: "SprintRetrospectiveDialog",
        description:
          "Completion and retrospective dialog for capturing sprint notes and carry-over tasks.",
        render: () => <SprintRetrospectiveDialogDemo />,
      },
    ],
  },
  {
    id: "time-block-row",
    name: "TimeBlockRow",
    group: "Composed",
    summary:
      "TimeBlockRow composed component displaying category color swatch and icon, title, local times and duration, status badges, conflict warnings, project/task context, and action controls.",
    states: [
      {
        id: "time-block-row-default",
        name: "Default",
        description:
          "TimeBlockRow in scheduled, active current, completed, conflict warning, and loading skeleton states.",
        render: () => <TimeBlockRowDemo />,
      },
    ],
  },
  {
    id: "time-block-form",
    name: "TimeBlockForm",
    group: "Composed",
    summary:
      "Form dialog for creating and editing Time Blocks with title, category, linked task/project, date/time range, timezone, notes, DST validation, and conflict resolution override.",
    states: [
      {
        id: "time-block-form-default",
        name: "Default",
        description: "Interactive specimens for Create and Edit TimeBlockForm dialogs.",
        render: () => <TimeBlockFormDemo />,
      },
    ],
  },
  {
    id: "day-timeline",
    name: "DayTimeline",
    group: "Composed",
    summary:
      "24-hour visual time scale grid for scheduling time blocks with current time now line, gap slots, collision layout, density toggle, drag/resize handles, keyboard navigation, and small-screen list fallback.",
    states: [
      {
        id: "day-timeline-default",
        name: "Default",
        description:
          "DayTimeline showing visual grid, time blocks, now line, density toggle, list fallback mode, and interactive callbacks.",
        render: () => <DayTimelineDemo />,
      },
    ],
  },
  {
    id: "time-summary",
    name: "TimeSummary",
    group: "Composed",
    summary:
      "Time summary dashboard components composing Focus/Break/Personal/Unscheduled metric cards, category breakdown DonutChart with accessible text/table summary, daily focus goal progress card, and upcoming scheduled time blocks list with quick actions.",
    states: [
      {
        id: "time-summary-default",
        name: "Default",
        description:
          "TimeSummary overview displaying metric strip, time category breakdown donut chart, goal progress ring, upcoming blocks list, and quick action callbacks.",
        render: () => <TimeSummaryDemo />,
      },
    ],
  },
  {
    id: "time-blocks-screen",
    name: "TimeBlocksScreen",
    group: "Composed",
    summary:
      "Full Time Blocks screen with page header, date navigation, Day/Week view switcher, focus toggle, summary panel toggle, DayTimeline visual grid, TimeSummary overview, TimeBlockForm dialog, delete confirmation dialog, and mock UX states (populated, week view, conflict, DST transition, offline, loading, empty, and error).",
    states: [
      {
        id: "time-blocks-screen-default",
        name: "Default",
        description:
          "TimeBlocksScreen overview demonstrating interactive specimens across Day view, Week view, Conflict, DST transition, Offline, Loading, Empty, and Error states.",
        render: () => <TimeBlocksScreenDemo />,
      },
    ],
  },
  {
    id: "calendar-header",
    name: "CalendarHeader",
    group: "Composed",
    summary:
      "Date-aware Calendar navigation with previous/next period controls, Today return, Day/Week/Month view selection, and an optional Add Time Block action.",
    states: [
      {
        id: "calendar-header-ready",
        name: "Ready",
        description: "Interactive month header with local-date navigation and view controls.",
        render: () => <CalendarHeaderDemo />,
      },
    ],
  },
  {
    id: "calendar-events",
    name: "EventChip and OverflowList",
    group: "Composed",
    summary:
      "Source-labelled Calendar event projections and a keyboard/touch-operable dense-day disclosure that preserves canonical source selection.",
    states: [
      {
        id: "calendar-events-ready",
        name: "Sources and overflow",
        description: "Timed and all-day source types plus the accessible overflow list.",
        render: () => <CalendarEventDemo />,
      },
    ],
  },
  {
    id: "calendar-filter-legend",
    name: "CalendarFilterLegend",
    group: "Composed",
    summary:
      "A controlled, labelled source legend that combines accessible checkboxes with redundant source color markers and optional counts.",
    states: [
      {
        id: "calendar-filter-ready",
        name: "All sources",
        description: "All canonical Calendar source types selected with current counts.",
        render: () => <CalendarFilterDemo />,
      },
    ],
  },
  {
    id: "calendar-grids",
    name: "Calendar grids and list alternative",
    group: "Composed",
    summary:
      "Day, week and six-week month Calendar grids with a distinct all-day lane, keyboard/touch date selection, dense-day overflow, responsive agendas, and a semantic list alternative.",
    states: [
      {
        id: "calendar-grids-ready",
        name: "Ready",
        description: "Populated day, week and month views followed by the same records as a list.",
        render: () => <CalendarGridsDemo />,
      },
    ],
  },
  {
    id: "week-planner-strip",
    name: "WeekStrip",
    group: "Composed",
    summary:
      "Seven-day week plan strip displaying daily planned vs available capacity, task completion count, overcapacity and conflict badges, accessible day selection, and non-drag action menu controls.",
    states: [
      {
        id: "week-strip-ready",
        name: "Ready",
        description:
          "Populated seven-day strip with today marker, overcapacity badge, conflict indicator, and day actions.",
        render: () => <WeekStripReadyDemo />,
      },
      {
        id: "week-strip-loading",
        name: "Loading",
        description: "Loading skeleton grid for week strip.",
        render: () => <WeekStripLoadingDemo />,
      },
    ],
  },
  {
    id: "week-planner-capacity",
    name: "WeekCapacitySummary",
    group: "Composed",
    summary:
      "Weekly workload vs capacity card displaying total planned time, workload progress meter, task completion count, time allocation DonutChart breakdown, and overcapacity alert notice.",
    states: [
      {
        id: "week-capacity-summary-ready",
        name: "Balanced Plan",
        description: "Balanced weekly workload with allocation breakdown and task progress.",
        render: () => <WeekCapacitySummaryReadyDemo />,
      },
      {
        id: "week-capacity-summary-overcapacity",
        name: "Overcapacity",
        description:
          "Overcapacity warning state with extra planned hours notice and conflict badge.",
        render: () => <WeekCapacitySummaryOvercapacityDemo />,
      },
      {
        id: "week-capacity-summary-loading",
        name: "Loading",
        description: "Loading skeleton state for weekly capacity summary.",
        render: () => <WeekCapacitySummaryLoadingDemo />,
      },
    ],
  },
]);
