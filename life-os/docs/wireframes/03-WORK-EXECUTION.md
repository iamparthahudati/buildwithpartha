# Projects, tasks, scheduling and focus wireframes

## Shared list screen pattern

```text
LARGE
┌──────────────────────────────────────────────────────────────────────┐
│ [C PageHeader title/helper]                         (*) Add [record] │
├──────────┬──────────┬──────────┬──────────┬──────────────────────────┤
│ [C MetricCard strip]                                                │
├──────────────────────────────────────────────────────────────────────┤
│ tabs/presets   [C FilterBar] [Sort] [View] [Search]                  │
├──────────────────────────────────────────────────────────────────────┤
│ [C DataTable: semantic table + actions]                              │
│ row                                                                  │
│ selected row --------------------------------------------------------│
├──────────────────────────────────────────────────────────────────────┤
│ result count                              [C Pagination]             │
└──────────────────────────────────────────────────────────────────────┘
                                      ┌───────────────────────────────┐
                                      │ [C DetailPanel / route sync]  │
                                      │ [tabs and feature content]    │
                                      └───────────────────────────────┘

SMALL
PageHeader + Add
[search]
[filter/sort buttons -> drawer]
[active chips]
[F RecordCard] x N
[load/pagination]
detail -> full route/sheet
```

## Projects — `/app/projects`

Metrics: total, active, completed, on hold, at risk, progress. Presets: All, Active, On hold, Completed, Archived. `[F] ProjectRow/Card` shows identity, status, progress, task count, deadline, priority and health.

Project form is `[C FormDialog]` on large and full-screen form on small:

```text
Name* / Outcome-description
Status / Priority / Health
Icon+color / Labels
Start / Deadline / Estimate
[advanced]
Cancel                       (*) Create/Save
```

## Project details — `/app/projects/:projectId`

```text
┌───────────────────────────────────────────────────────────────────┐
│ Back  [icon] Project name [status]        Edit  (*) Add task  ...│
│ owner · priority · start · deadline · estimate · archived state   │
├───────────────────────────────────────────────────────────────────┤
│ Overview | Tasks | Timeline | Files* | Notes | Activity           │
├────────────────────────────────────┬──────────────────────────────┤
│ progress / task / time / health    │ [F MilestoneTimeline]       │
│ [C MetricCards]                    │ milestone list + actions    │
├──────────────────┬─────────────────┼──────────────────────────────┤
│ task breakdown   │ priority chart  │ top tasks                   │
├──────────────────┴─────────────────┼──────────────────────────────┤
│ recent activity                    │ files*/project notes        │
├────────────────────────────────────┴──────────────────────────────┤
│ description                                         labels       │
└───────────────────────────────────────────────────────────────────┘
```

Small keeps header summary, horizontally overflow-managed Tabs, then one column: primary progress, top tasks, milestones, activity, description. Optional Files tab is hidden when storage gate is off.

## Tasks — `/app/tasks`

Metrics/presets: All, To Do, In Progress, Blocked, Done, Overdue. Table/card columns: select, title/subtask/comment/MIT, project, priority, status, due, progress, actions.

Bulk action bar replaces/appears above filters only with selection:

```text
3 selected | Status | Priority | Project | Labels | Schedule | Archive | Clear
```

Partial results keep failed selections and show exact reasons.

## Task details — `/app/tasks/:taskId`

```text
┌─────────────────────────────────────────────────────┐
│ Task title [status]                         ... [x] │
│ project · P1 · due · blocked/MIT                    │
├─────────────────────────────────────────────────────┤
│ Details | Subtasks | Dependencies | Comments |      │
│ Files* | Activity                                  │
├─────────────────────────────────────────────────────┤
│ Description                                         │
│ [F SubtaskChecklist + progress]                     │
│ metadata: estimate/time/progress/labels             │
│ [F SchedulingPanel: blocks + Start Focus]           │
└─────────────────────────────────────────────────────┘
```

Wide list uses a 380–480px DetailPanel; canonical detail route may use full content. Small always uses full route. Close/Back restores list query/page/scroll/focus.

Dependency editor:

```text
BLOCKED BY                          BLOCKS
[search tasks]                     dependent list
selected blocker + status          open/remove
[cycle/self/error explanation]
```

## Time Blocks — `/app/time-blocks`

```text
┌────────────────────────────────────────────────────────────────────┐
│ Time Blocks  Day|Week  < date > Today       Focus mode (*) Add    │
├──────────┬──────────┬──────────┬──────────┬────────────────────────┤
│ focus    │ completed│ scheduled│ break    │ conflict/capacity     │
├───────────────────────────────────────────┬────────────────────────┤
│ [F DayTimeline]                           │ time summary donut+text│
│ time | chronological coloured rows        │ focus goal             │
│ now  | current/complete/conflict           │ upcoming blocks        │
│      | drag/resize enhancement             │ quick actions          │
│      | keyboard Create/Move/Resize forms   │                        │
└───────────────────────────────────────────┴────────────────────────┘
```

Small replaces the timeline grid with chronological TimeBlockRows and date navigation; Add is sticky-safe. Week view uses daily columns on large and selectable day strip + list on small.

Conflict resolution dialog:

```text
This overlaps “Deep work” 10:00–11:00.
[Edit new block] [Open existing] [Save overlap intentionally]
```

Intentional override is explicit and never the default.

## Calendar — `/app/calendar`

```text
PageHeader  < period > Today   Day|Week|Month   Add
[FilterBar: blocks, due tasks, milestones, habits, reviews]
┌───────────────────────────────────────────────────────────────┐
│ all-day lane / day columns / month cells                      │
│ [F EventChip: source type + time/title + status]              │
│ +N more -> accessible overflow list                           │
└───────────────────────────────────────────────────────────────┘
```

Small uses day agenda by default; month is navigable with a selected-date agenda below. Selecting an item opens its canonical source, not a copied calendar record.

## Focus Mode — `/app/focus`

```text
┌───────────────────────────────────────────────┐
│ Focus Mode                                    │
│ [task/time-block context + open link]         │
│                                               │
│            [C TimerRing 25:00]                │
│             Focus / Paused / Break            │
│                                               │
│      (*) Start/Pause/Resume   Complete         │
│      Cancel session · Skip break              │
│                                               │
│ [optional interruption note]                  │
│ planned / elapsed / cycle                     │
└───────────────────────────────────────────────┘
```

Mobile centers the timer with controls in reachable order. Fullscreen is optional browser enhancement. Completion/cancel uses explicit dialog where time/task side effects need confirmation. Timer announcements occur on state transitions, not every second.
