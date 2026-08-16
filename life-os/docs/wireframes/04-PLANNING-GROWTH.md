# Sprints, week planning, goals and habits wireframes

## Sprints — `/app/sprints`

```text
PageHeader                                      (*) New sprint
[Active] [Upcoming] [Completed]
┌───────────────────────────────┬──────────────────────────────┐
│ [F SprintCard]                │ active sprint detail        │
│ goal · dates · capacity       │ progress/capacity           │
│ committed/completed/changed   │ [F CommitmentList]          │
│ status/action                 │ scope-change history        │
└───────────────────────────────┴──────────────────────────────┘
```

Small stacks cards; selected sprint opens canonical route. Complete Sprint dialog shows committed/completed/added/removed, carry-over choices and retrospective before confirm.

## Week Planner — `/app/week-planner`

```text
┌───────────────────────────────────────────────────────────────────┐
│ Week Planner  < 11–17 Aug >       Draft/Saved  (*) Finalize plan │
├───────────────────────────────────────────────────────────────────┤
│ [F WeekStrip: 7 days, planned/available, task count, conflict]    │
├────────────────────────────────────┬──────────────────────────────┤
│ [F WeeklyOutcomes]                 │ [F CapacitySummary]          │
│ selected goals/tasks               │ total/available/over plan    │
├────────────────────────────────────┼──────────────────────────────┤
│ day plan / blocks / allocated work │ [F UnscheduledQueue]        │
│ drag enhancement + Move form       │ filters + task cards        │
├────────────────────────────────────┴──────────────────────────────┤
│ conflicts / carry-over candidates / review link                  │
└───────────────────────────────────────────────────────────────────┘
```

Small: selectable WeekStrip day -> outcomes -> that day's plan -> unscheduled queue -> capacity/conflicts. Move action opens day/time selector; no drag dependency.

## Goals — `/app/goals` and `/:goalId`

```text
LIST                                   DETAIL
PageHeader + Add                       Goal name [status] Edit
[status/category filters]              motivation/target/date
[F GoalCard]                           [F ProgressEditor]
 title/category/target                 [C chart + data summary]
 progress + next check-in              [F CheckInHistory]
 linked projects/tasks/habits          linked work + calculation note
```

Goal creation chooses progress type first: percentage, numeric target, milestone or binary. Fields update through one FormDialog without hiding calculation rules.

## Habits — `/app/habits` and `/:habitId`

```text
TODAY/LIST                             DETAIL
PageHeader + date + Add                Habit name [active/paused]
[F HabitRow]                           today entry control
 icon/name/cadence                     streak/consistency metrics
 [F EntryControl] count/check          [F Heatmap + table fallback]
 streak/consistency                    history / notes / reminders
```

Small Today list makes entry controls large and keeps archive/settings secondary. Paused dates appear neutral and do not break streak visually. Editing a past entry uses a date-labelled dialog and records activity.

## Shared empty and planning states

- No sprint: explain bounded commitment and offer Create sprint; Today hides sprint metrics.
- No weekly plan: show optional planning benefit and Start plan; do not label the week unplanned as failure.
- No goals/habits: one primary creation action, no zero charts/streak shame.
- Overcapacity: text/icon warning + Open conflicts/Adjust capacity; never auto-remove work.
