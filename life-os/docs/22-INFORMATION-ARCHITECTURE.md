# LifeOS information architecture

## Mental model

LifeOS is one connected loop, not a collection of mini-apps:

```text
Capture -> Clarify -> Plan -> Schedule -> Focus -> Complete -> Review -> Adjust
```

- Brain Dump and Quick Add capture.
- Tasks/projects/goals/notes clarify meaning and destination.
- Sprints and Week Planner select commitments.
- Time Blocks and Calendar reserve time.
- Focus Mode executes a linked task/block.
- Progress/Reports and Reviews reflect and adjust.

## Primary navigation groups

### Execute

1. Today — current-day decision and action surface.
2. Tasks — complete actionable inventory and inbox.
3. Time Blocks — deliberate day/week schedule.
4. Focus — accessed globally through timer/start actions; full surface is contextual rather than a permanent duplicate list.

### Plan

5. Projects — finite outcomes and their work.
6. Sprints — bounded commitments.
7. Week Planner — capacity and weekly outcomes.
8. Calendar — time/due/milestone/review view.
9. Goals — longer outcomes and check-ins.

### Capture and grow

10. Notes — durable private reference/thinking.
11. Brain Dump — unprocessed fast capture inbox.
12. Habits — recurring behaviors and entries.

### Reflect

13. Progress — current trends and summaries.
14. Reports — configurable historical analysis/export.
15. Reviews — daily/weekly/monthly flows, reached from Today and history.

On compact navigation, labels remain the same; groups may collapse but destinations do not change names.

## Global utilities

- Quick Add: creation entry across approved record types.
- Search: account-wide retrieval and command entry.
- Notifications: reminders, jobs and security events.
- Active Focus: session state/actions across routes.
- Account/Settings: profile, planning, notification, appearance/accessibility, security and data controls.
- Help/legal/status: contextual help, privacy, terms and safe service status/error routes.

## Entity relationships

```text
Goal
  -> Projects, Tasks, Habits, Check-ins

Project
  -> Milestones, Tasks, Notes, Attachments*, Comments, Activity

Task
  -> Subtasks, Dependencies, Labels, Time Blocks, Focus Sessions,
     Comments, Attachments*, Activity, optional Project/Goal/Sprint

Weekly Plan / Sprint
  -> selected Tasks, Goals, capacity and snapshot/review

Time Block
  -> optional Task/Project, Focus Session, Calendar representation

Review
  -> immutable metric snapshot plus deliberate carry-over decisions

* Optional v1 gate
```

Links point to one canonical record. Calendar events, Today rows and report results never create alternate copies of projects/tasks/blocks.

## Destination rules

- List routes own search/filter/sort/pagination in the URL.
- Stable detail routes own entity tabs and support refresh/bookmarks.
- A wide-screen detail panel synchronizes to the detail URL or an explicitly shareable selection parameter; mobile uses the same entity route.
- Closing detail returns to the exact list context where possible.
- Creation may open from any context, but success leads to the canonical record or restores the prior view with a clear result.
- Archive is a filter/state, not a separate disconnected module.
- Overdue and Blocked are derived views of tasks, not separate record types.
- Labels is the only cross-record taxonomy term; “Tags” is not a second feature.

## Findability paths

Each important record is reachable through at least two safe paths:

- direct module list/details;
- global search;
- linked source context such as Today, project, goal, calendar or report.

No feature depends only on a dashboard widget. Empty/failed widgets link to their canonical module.

## Progressive adoption

A new user may use Today + Tasks + Brain Dump only. Empty Projects/Sprints/Goals/Habits/Reports remain quiet and do not block core use. The shell may visually de-emphasize unused advanced destinations through onboarding guidance, but routes remain stable and discoverable.

## Naming decisions

- Today, not Home/Dashboard.
- Time Blocks, not Time Block.
- Brain Dump is the capture inbox; Inbox may be a task filter, not a competing module.
- Progress shows concise trends; Reports offers filters/details/export.
- Reviews groups Daily, Weekly and Monthly history/flows.
- Labels is the UI/domain/API term; priority and urgency remain separate.

## Architecture acceptance

- Every v1 screen and global action has one canonical place.
- No duplicated content entity or synonym requires the user to guess where data lives.
- The primary loop and top ranked jobs are navigable without Reports, AI or Teams.
- Responsive navigation preserves destination identity and canonical URLs.

