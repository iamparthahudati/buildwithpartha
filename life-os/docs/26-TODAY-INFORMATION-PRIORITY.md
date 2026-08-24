# Today dashboard information priority

## Purpose

Today is the daily decision and execution surface—not a generic analytics dashboard. Within seconds it must answer:

1. What matters most today?
2. What should I do now or next?
3. What time is already committed?
4. What needs deliberate replanning?
5. Is the current week still realistic?

Historical analysis belongs in Progress/Reports. Full inventories belong in their canonical modules.

## Priority order

### Priority 0 — Persistent context and action

- Local greeting/date and timezone-aware “Today”.
- Quick Add.
- Active Focus mini-player when a session exists.
- Search, notifications and account controls from the shell.

These remain available without consuming the main content hierarchy.

### Priority 1 — Immediate decision

1. Today's MIT: title, project context, priority/due risk, complete/open/start-focus/change action.
2. Current or next Time Block: local time, linked work/category, start/open/complete action.
3. “Next up” only after MIT completion or when no MIT is selected; ranking is deterministic and explained, not described as AI.

If no MIT exists, the primary empty action is Choose today's focus from eligible tasks or create one.

### Priority 2 — Today's realistic plan

- Today's task list: due/today/explicitly planned tasks, not the entire backlog.
- Today's schedule: time blocks in chronological order with now/current, completion and conflict state.
- Compact overdue/replan queue: count and top few items with Review all; overdue never consumes the whole page.

### Priority 3 — Capacity and trajectory

- Current sprint summary when an active sprint exists.
- Current week capacity/progress and weekly outcomes.
- Active projects requiring attention, limited to the most relevant few.
- Daily focus planned versus actual when a target/plan exists.

### Priority 4 — Capture and reflection

- Morning/evening Daily Review status and start/resume action.
- Compact Brain Dump capture/recent unprocessed count.
- Habits due today, limited with link to all.
- Notifications/reminders remain primarily global; Today shows only actionable contextual prompts.

## Metric strip

Desktop may show at most six concise metrics; mobile initially shows the four most actionable and offers More only if useful.

Default order:

1. Today's focus/MIT state.
2. Tasks planned today.
3. Scheduled time.
4. Focus time actual versus planned/target.
5. Active projects needing attention.
6. Current week completion/capacity.

Metrics with no meaningful denominator show an absolute value or setup action, never `0%` as a negative judgment.

## Widget source and state contract

| Widget | Canonical source | Primary action | Freshness | First-use/empty | Error behavior |
| --- | --- | --- | --- | --- | --- |
| MIT | Task + per-local-date MIT assignment | Start/open/choose/change/complete | Immediately invalidated after task/MIT mutation | Choose focus or create task | Preserve other widgets; retry/open Tasks |
| Current/next block | Time Block range query | Start/open/add | Re-evaluate on clock boundary and mutation; server data authoritative | Add a time block | Isolated retry/open Time Blocks |
| Today's tasks | Task query by explicit plan/due/local date | Complete/open/add | Immediate after task/schedule changes | Add first task | Isolated retry/open Tasks |
| Schedule | Time Block query | Open/add/resolve conflict | Immediate after block/focus changes | Plan part of the day | Isolated retry/open Time Blocks |
| Overdue/replan | Derived Task query | Review/reschedule/complete | Immediate after task mutation; local-date boundary refresh | Hidden with no “zero guilt” celebration | Show count unavailable, not zero |
| Focus summary | Focus sessions + optional target/planned blocks | Start/open Focus | Active session transitions live; aggregate refresh after completion | Show actual only or set optional target | Preserve timer state; summary retry |
| Sprint | Current Sprint + committed tasks | Open/update sprint | After sprint/task changes | Hide; optional “Plan a sprint” below core | Isolated retry/open Sprints |
| Week | Weekly Plan + tasks/blocks/goals | Open Week Planner | After plan/task/block changes | Explain optional weekly planning | Isolated retry/open Week Planner |
| Active projects | Project list/health/progress | Open/add project | After project/task changes | Add first project below daily core | Isolated retry/open Projects |
| Review | Review record for local period | Start/resume/open | After draft/final/skip | Morning/evening prompt at appropriate time | Preserve saved draft state; retry |
| Brain Dump | Unprocessed item count + fast create | Capture/process | Immediate after capture/conversion | Capture field remains usable | Preserve draft; queued/offline label |
| Habits | Habit cadence + entries for local date | Record/open | Immediate after entry mutation | Hide or optional create prompt below core | Isolated retry/open Habits |

Every aggregate response supplies `generatedAt`, user timezone, local date and per-widget success/empty/error state. A widget failure cannot replace successful content with a full-page error.

## Progress definitions

- Today's task completion: completed eligible planned/today tasks divided by total eligible planned/today tasks. Cancelled items excluded; no denominator means “No tasks planned,” not 0%.
- Current week completion: completed committed weekly items divided by committed items; uncommitted backlog excluded.
- Project progress: uses the project-level calculation policy only; Today never recalculates it differently.
- Focus planned versus actual: confirmed whole focus minutes from Completed Focus Sessions are attributed to the Account-local date containing `startedAt`; Cancelled sessions are excluded. Non-cancelled Focus Time Blocks are clipped to the exact local-day instants and provide the denominator when any planned focus minutes exist; otherwise the optional daily target is used. The chosen denominator is labelled, an absent denominator stays null/absolute rather than `0%`, and actual time may truthfully exceed 100%.
- Overall progress is not shown unless the metric dictionary defines one defensible formula. Prefer named progress domains over a vague global percentage.

## Responsive composition order

### Mobile

1. Heading/date and compact Quick Add.
2. Active Focus/current block when present.
3. MIT/choose-focus card.
4. Today's tasks.
5. Today's schedule.
6. Overdue/replan compact queue.
7. Daily Review prompt.
8. Week/sprint summary.
9. Active projects.
10. Brain Dump and habits.

Metrics appear as a compact horizontally scrollable labelled group only if each card remains keyboard/touch accessible; otherwise use a two-column grid/list. No core action depends on horizontal page scrolling.

### Tablet

MIT and current/next block lead; tasks/schedule may form two columns where readable. Week/sprint follows. Detail opens as wide drawer/full route.

### Desktop

Use a 12-column content grid:

- metric strip full width;
- daily plan/tasks and schedule as the main 7–8 columns;
- immediate/current/week/review context in 4–5 columns;
- projects/capture/habits below the execution row.

Visual prominence follows priority, not equal card sizes. Avoid nesting scroll areas in the core day plan.

## First-use dashboard

After onboarding Start empty:

- Show date, Quick Add and an MIT/first-task invitation.
- Offer three ordered actions: Add a task, reserve a time block, capture a thought.
- Explain optional Projects/Week Planner/Habits without presenting zero metrics as failure.
- Do not render fake charts, sample projects, fictional schedule rows or artificial progress.

## Overloaded-day behavior

- Limit widget rows and link to canonical lists.
- Highlight conflicts and capacity overflow with text/icon, not just color.
- Do not automatically reschedule or change priority.
- Provide Review plan as the main recovery action and preserve explicit user choices.

## Loading, offline and time boundaries

- Reserve layout and load widgets independently; existing data remains during background refresh.
- Offline banner shows last successful `generatedAt`; server-dependent actions are disabled or honestly queued according to capability.
- At local midnight, refetch Today and update date; an active focus session/block remains continuous by its instant timestamps.
- Timezone change invalidates all date-bound queries and displays the newly calculated local day.

## Accessibility

- Heading hierarchy follows page -> section -> item; cards are not all headings at the same level.
- Metric labels and values are readable text; charts/rings add accessible summaries.
- Updating timer does not announce every second; task/block completion announces one concise result.
- Each widget has labelled loading/error region and Retry with no focus loss.
- Mobile reading order matches visual priority and desktop source order remains logical.

## Acceptance criteria

- MIT/current-next/today plan appear before analytics or long-term summaries.
- Each widget has one canonical source, action, freshness, empty and error contract.
- Metric formulas cannot contradict canonical module/report calculations.
- First-use, normal, overloaded, partial error, offline, local-midnight and timezone-change states are defined.
- Responsive collapse order preserves execution actions and removes no keyboard/touch path.
