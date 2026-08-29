# Analytics Metric Dictionary

- Document Version: 1.0.0
- Effective Date: 2026-08-26
- Status: Approved Baseline (LOS-1105)

## 1. Overview and Governance

This document establishes the canonical metric dictionary for LifeOS. Every metric displayed across dashboards (Today, Projects, Tasks, Time, Sprints, Goals, Reviews), API endpoints, progress screens, and exported reports (CSV, PDF) MUST adhere strictly to the definitions, formulas, time boundaries, exclusions, rounding, and zero-data rules defined herein.

### 1.1 Governance and Semantic Versioning

Metric definitions follow Semantic Versioning (`MAJOR.MINOR.PATCH`):
- **MAJOR**: Breaking changes to metric formulas, underlying entity definitions, temporal boundaries, or denominator rules that alter historical comparability.
- **MINOR**: Addition of new metrics, optional filter parameters, or non-breaking field clarifications.
- **PATCH**: Documentation corrections, formatting fixes, or non-functional structural updates.

All reporting and analytics APIs MUST expose or reference the metric dictionary version (`v1.0.0`) in response headers or metadata to guarantee transparency.

### 1.2 Required Metric Schema Standard

Every metric in this dictionary is specified using the standard 8-attribute schema:
1. **Metric Key & Name**: Canonical identifier (e.g., `METRIC_TASK_DUE_TODAY`) and clear human-readable title.
2. **Formula**: Unambiguous mathematical or logical expression.
3. **Source**: Underlying database entities, JPA domain aggregates, or event streams.
4. **Grain**: Aggregational scope (e.g., Daily per Account, Weekly per Sprint, Real-time Snapshot).
5. **Timezone & Local Date Handling**: Exact rules for IANA timezone resolution, UTC instant conversion, and DST transits.
6. **Exclusions**: Explicit filtering constraints (e.g., soft-deleted items, cancelled focus sessions, non-working days).
7. **Rounding**: Decimal precision, integer rules, and rounding methods.
8. **Freshness**: Caching lifecycle, query invalidation, or immutable snapshot status.
9. **Zero-Data / Null Interpretation**: Semantic distinction between measured zero `0`, missing denominator `null`, uninitialized state, and empty dataset copy.

---

## 2. Shared Principles and Boundary Rules

### 2.1 Timezone & DST Resolution Policy
- **IANA Timezone Context**: All local-date calculations resolve the Account's configured IANA Timezone (e.g., `Asia/Kolkata`, `America/New_York`).
- **Local Day Instant Boundaries**: A local day starts at `00:00:00.000` and ends at `23:59:59.999999999` in the target timezone.
- **DST Transit Handling**:
  - **Spring-Forward (23-Hour Day)**: Instant range shrinks to 23 hours. Events falling within the skipped hour are invalid.
  - **Fall-Back (25-Hour Day)**: Instant range expands to 25 hours. Events falling within the repeated hour are disambiguated to the earlier occurrence unless explicitly tagged.
- **Timestamp Attribution**:
  - Completed events (Tasks, Focus Sessions) are attributed to the local date of their completion or start instant in the Account's timezone.

### 2.2 Denominator & Zero-Data Principles
- **0 vs NULL**:
  - `0`: A valid measurement resulting in zero (e.g., 0 overdue tasks, 0 completed focus minutes when activity occurred).
  - `NULL`: An undefined measurement due to a missing denominator (e.g., planned-vs-actual ratio when planned focus minutes = 0 and no target is set).
- **Labelled Denominators**: Any metric ratio MUST explicitly label its denominator source (e.g., `planned_blocks` vs `daily_target_fallback`).

### 2.3 Non-Causal Claims Enforcement
- Analytics text and automated summaries MUST NOT generate unsupported causal assertions (e.g., "Skipping review caused task delays"). Copy MUST remain descriptive and factual (e.g., "3 tasks were delayed in weeks without a completed review").

---

## 3. Metric Catalog by Domain

### 3.1 Task Management Metrics

#### `TASK_TOTAL_COUNT` — Total Tasks Count
- **Name**: Total Tasks Count
- **Formula**: $\sum \text{Task}$ where $\text{deletedAt IS NULL}$
- **Source**: `tasks` table / `Task` domain aggregate
- **Grain**: Account snapshot or filtered scope (Project, Label, Category)
- **Timezone**: Not date-bound (current account state)
- **Exclusions**: Soft-deleted tasks (`deletedAt IS NOT NULL`)
- **Rounding**: Integer
- **Freshness**: Real-time query or cache-invalidated on Task CRUD
- **Zero-Data / Null Interpretation**: `0` indicates no tasks exist matching the scope.

#### `TASK_DUE_TODAY_COUNT` — Tasks Due Today
- **Name**: Tasks Due Today
- **Formula**: $\sum \text{Task}$ where $\text{dueDate} = \text{LocalDate.now}(\text{AccountTimeZone})$ and $\text{status} \neq \text{'COMPLETED'}$ and $\text{deletedAt IS NULL}$
- **Source**: `tasks` table / `Task` domain aggregate
- **Grain**: Daily per Account
- **Timezone**: Resolved using Account IANA timezone to local date
- **Exclusions**: Soft-deleted tasks, completed tasks, tasks due on other dates
- **Rounding**: Integer
- **Freshness**: Real-time or invalidated at local midnight / task mutation
- **Zero-Data / Null Interpretation**: `0` indicates no pending tasks due on current date.

#### `TASK_OVERDUE_COUNT` — Overdue Tasks Count
- **Name**: Overdue Tasks Count
- **Formula**: $\sum \text{Task}$ where $\text{dueDate} < \text{LocalDate.now}(\text{AccountTimeZone})$ and $\text{status} \neq \text{'COMPLETED'}$ and $\text{deletedAt IS NULL}$
- **Source**: `tasks` table / `Task` domain aggregate
- **Grain**: Daily per Account
- **Timezone**: Account IANA timezone
- **Exclusions**: Soft-deleted tasks, completed tasks, tasks without due date
- **Rounding**: Integer
- **Freshness**: Real-time or invalidated at local midnight
- **Zero-Data / Null Interpretation**: `0` indicates all past tasks are completed or non-existent.

#### `TASK_HIGH_PRIORITY_COUNT` — High Priority Open Tasks
- **Name**: High Priority Open Tasks Count
- **Formula**: $\sum \text{Task}$ where $\text{priority} \in \{\text{'P0'}, \text{'P1'}\}$ and $\text{status} \neq \text{'COMPLETED'}$ and $\text{deletedAt IS NULL}$
- **Source**: `tasks` table
- **Grain**: Account snapshot
- **Timezone**: N/A
- **Exclusions**: Soft-deleted tasks, completed tasks, P2/P3/P4 priority tasks
- **Rounding**: Integer
- **Freshness**: Real-time / cache-invalidated on task mutation
- **Zero-Data / Null Interpretation**: `0` indicates no open urgent/high priority tasks.

#### `TASK_COMPLETED_TODAY_COUNT` — Tasks Completed Today
- **Name**: Tasks Completed Today
- **Formula**: $\sum \text{Task}$ where $\text{completedAt}$ falls within local date instants of $\text{LocalDate.now}(\text{AccountTimeZone})$ and $\text{deletedAt IS NULL}$
- **Source**: `tasks` table (`completed_at` timestamp)
- **Grain**: Daily per Account
- **Timezone**: Account IANA timezone instant conversion
- **Exclusions**: Soft-deleted tasks, tasks completed on previous local dates
- **Rounding**: Integer
- **Freshness**: Real-time / cache-invalidated on task status change
- **Zero-Data / Null Interpretation**: `0` indicates no tasks were completed today.

#### `TASK_BLOCKED_COUNT` — Blocked Tasks Count
- **Name**: Blocked Tasks Count
- **Formula**: $\sum \text{Task}$ where derived $\text{isBlocked} = \text{true}$ (uncompleted prerequisite dependencies exist) and $\text{deletedAt IS NULL}$
- **Source**: `tasks` join `task_dependencies`
- **Grain**: Account snapshot
- **Timezone**: N/A
- **Exclusions**: Soft-deleted tasks, completed tasks, tasks with all prerequisites met
- **Rounding**: Integer
- **Freshness**: Real-time / invalidated on dependency/task completion mutation
- **Zero-Data / Null Interpretation**: `0` indicates no tasks are currently waiting on dependencies.

---

### 3.2 Time & Focus Session Metrics

#### `FOCUS_PLANNED_MINUTES` — Planned Focus Time (Minutes)
- **Name**: Planned Focus Time (Minutes)
- **Formula**: $\sum \text{DurationMinutes}(\text{Clipped}(\text{TimeBlock}, \text{LocalDay}))$ where $\text{category} = \text{'FOCUS'}$ and $\text{status} \neq \text{'CANCELLED'}$
- **Source**: `time_blocks` table
- **Grain**: Daily / Period per Account
- **Timezone**: Account IANA timezone; blocks spanning local midnight are clipped to local day bounds.
- **Exclusions**: Cancelled time blocks, non-focus categories (Break, Admin, Personal)
- **Rounding**: Integer minutes (rounded down)
- **Freshness**: Real-time query / cache-invalidated on time block mutation
- **Zero-Data / Null Interpretation**: `0` indicates no focus time blocks planned for the day.

#### `FOCUS_ACTUAL_MINUTES` — Actual Completed Focus Time (Minutes)
- **Name**: Actual Completed Focus Time (Minutes)
- **Formula**: $\sum \text{actualDurationMinutes}$ where $\text{FocusSession.status} = \text{'COMPLETED'}$ and $\text{startedAt}$ falls within local day
- **Source**: `focus_sessions` table
- **Grain**: Daily / Period per Account
- **Timezone**: Account IANA timezone; attributed to local date of session start.
- **Exclusions**: Abandoned, active, or cancelled focus sessions
- **Rounding**: Integer minutes
- **Freshness**: Real-time query / cache-invalidated on focus session completion
- **Zero-Data / Null Interpretation**: `0` indicates no completed focus sessions recorded for the period.

#### `FOCUS_PLANNED_VS_ACTUAL_RATIO` — Focus Planned vs Actual Ratio (%)
- **Name**: Focus Time Execution Ratio (%)
- **Formula**: 
  $$\begin{cases} 
  \frac{\text{FOCUS\_ACTUAL\_MINUTES}}{\text{FOCUS\_PLANNED\_MINUTES}} \times 100 & \text{if } \text{FOCUS\_PLANNED\_MINUTES} > 0 \\
  \frac{\text{FOCUS\_ACTUAL\_MINUTES}}{\text{ACCOUNT\_DAILY\_FOCUS\_TARGET}} \times 100 & \text{else if } \text{ACCOUNT\_DAILY\_FOCUS\_TARGET} > 0 \\
  \text{NULL} & \text{otherwise}
  \end{cases}$$
- **Source**: `focus_sessions`, `time_blocks`, `user_preferences`
- **Grain**: Daily per Account
- **Timezone**: Account IANA timezone
- **Exclusions**: Uncompleted sessions, cancelled blocks
- **Rounding**: 1 decimal place (e.g. `87.5%`)
- **Freshness**: Real-time
- **Zero-Data / Null Interpretation**: Returns `null` when neither planned focus time nor daily focus target exists. Labelled explicitly as `planned_blocks` or `target_fallback`.

#### `FOCUS_CATEGORY_BREAKDOWN` — Focus Category Time Distribution (%)
- **Name**: Focus Category Breakdown (%)
- **Formula**: For category $c$: $\frac{\text{FOCUS\_ACTUAL\_MINUTES}_c}{\text{TOTAL\_FOCUS\_ACTUAL\_MINUTES}} \times 100$
- **Source**: `focus_sessions` join `tasks` / `time_blocks`
- **Grain**: Daily / Weekly / Monthly per Account
- **Timezone**: Account IANA timezone
- **Exclusions**: Non-focus sessions
- **Rounding**: 1 decimal place; sum of percentages normalized to 100.0%
- **Freshness**: Cache-invalidated on focus session change
- **Zero-Data / Null Interpretation**: Empty map when total actual focus time is 0.

---

### 3.3 Project & Milestone Metrics

#### `PROJECT_TOTAL_COUNT` — Total Projects Count
- **Name**: Total Projects Count
- **Formula**: $\sum \text{Project}$ where $\text{deletedAt IS NULL}$
- **Source**: `projects` table
- **Grain**: Account snapshot
- **Timezone**: N/A
- **Exclusions**: Soft-deleted projects
- **Rounding**: Integer
- **Freshness**: Real-time
- **Zero-Data / Null Interpretation**: `0` indicates user has no active or archived projects.

#### `PROJECT_STATUS_COUNTS` — Projects Count by Status
- **Name**: Projects Count by Status
- **Formula**: $\sum \text{Project}$ grouped by $\text{status} \in \{\text{'PLANNING'}, \text{'IN_PROGRESS'}, \text{'ON_HOLD'}, \text{'COMPLETED'}, \text{'CANCELLED'}\}$
- **Source**: `projects` table
- **Grain**: Account snapshot
- **Timezone**: N/A
- **Exclusions**: Soft-deleted projects
- **Rounding**: Integer
- **Freshness**: Real-time
- **Zero-Data / Null Interpretation**: `0` for any status group with no projects.

#### `PROJECT_PROGRESS_PERCENT` — Project Progress (%)
- **Name**: Project Progress (%)
- **Formula**:
  $$\begin{cases}
  \frac{\sum \text{CompletedMilestones}}{\text{TotalMilestones}} \times 100 & \text{if } \text{TotalMilestones} > 0 \\
  \frac{\sum \text{CompletedTasks}}{\text{TotalTasks}} \times 100 & \text{else if } \text{TotalTasks} > 0 \\
  0.0 & \text{otherwise}
  \end{cases}$$
- **Source**: `projects`, `milestones`, `tasks`
- **Grain**: Project entity level
- **Timezone**: N/A
- **Exclusions**: Soft-deleted milestones and tasks
- **Rounding**: 1 decimal place (e.g. `65.0%`)
- **Freshness**: Real-time / invalidated on task or milestone status change
- **Zero-Data / Null Interpretation**: `0.0%` when project has no tasks or milestones.

---

### 3.4 Sprints & Weekly Planning Metrics

#### `SPRINT_COMPLETION_RATE` — Sprint Task Completion Rate (%)
- **Name**: Sprint Task Completion Rate (%)
- **Formula**: $\frac{\sum \text{CommittedTasksCompleted}}{\text{CommittedTasksTotal}} \times 100$
- **Source**: `sprints`, `sprint_task_commitments`
- **Grain**: Per Sprint
- **Timezone**: Account IANA timezone for sprint boundaries
- **Exclusions**: Tasks added mid-sprint (tracked separately as scope change)
- **Rounding**: 1 decimal place
- **Freshness**: Real-time during active sprint; frozen upon sprint completion
- **Zero-Data / Null Interpretation**: `null` if committed tasks total = 0.

#### `SPRINT_SCOPE_CHANGE_DELTA` — Sprint Scope Change Delta
- **Name**: Sprint Scope Change Delta
- **Formula**: $\text{TasksAddedAfterStart} - \text{TasksRemovedAfterStart}$
- **Source**: `sprint_scope_events`
- **Grain**: Per Sprint
- **Timezone**: Account IANA timezone
- **Exclusions**: Baseline commitments recorded at sprint start
- **Rounding**: Signed Integer (e.g. `+2`, `-1`, `0`)
- **Freshness**: Real-time until sprint closure
- **Zero-Data / Null Interpretation**: `0` indicates scope remained unchanged after start.

#### `WEEKLY_OUTCOMES_COMPLETION_RATE` — Weekly Outcomes Completion Rate (%)
- **Name**: Weekly Outcomes Completion Rate (%)
- **Formula**: $\frac{\sum \text{CompletedWeeklyOutcomes}}{\text{TotalWeeklyOutcomes}} \times 100$
- **Source**: `weekly_plans`
- **Grain**: Per Weekly Plan
- **Timezone**: Account IANA timezone
- **Exclusions**: Unfinalized draft plans
- **Rounding**: 1 decimal place
- **Freshness**: Real-time / frozen upon week plan finalization
- **Zero-Data / Null Interpretation**: `null` if total outcomes planned = 0.

---

### 3.5 Goal Tracking Metrics

#### `GOAL_PROGRESS_PERCENT` — Goal Progress Percentage (%)
- **Name**: Goal Progress Percentage (%)
- **Formula**: Depends on `Goal.progressType`:
  - **PERCENTAGE**: $\min\left(100.0, \frac{\text{currentValue}}{\text{targetValue}} \times 100\right)$
  - **NUMERIC**: $\min\left(100.0, \frac{\text{currentValue} - \text{startValue}}{\text{targetValue} - \text{startValue}} \times 100\right)$
  - **MILESTONE**: $\frac{\sum \text{CompletedLinkedWork}}{\text{TotalLinkedWork}} \times 100$
  - **BINARY**: $100.0$ if $\text{status} = \text{'COMPLETED'}$ else $0.0$
- **Source**: `goals`, `goal_check_ins`, `goal_links`
- **Grain**: Per Goal aggregate
- **Timezone**: N/A
- **Exclusions**: Archived goals, deleted linked work items
- **Rounding**: 1 decimal place
- **Freshness**: Real-time / updated on check-in or linked item completion
- **Zero-Data / Null Interpretation**: `0.0%` when no progress or check-in recorded.

#### `GOAL_CHECKIN_AGE_DAYS` — Days Since Last Goal Check-In
- **Name**: Days Since Last Goal Check-In
- **Formula**: $\text{LocalDate.now}(\text{AccountTimeZone}) - \text{LocalDate}(\text{lastCheckInAt})$
- **Source**: `goal_check_ins`
- **Grain**: Per Goal aggregate
- **Timezone**: Account IANA timezone
- **Exclusions**: Goals without check-in history
- **Rounding**: Integer days
- **Freshness**: Real-time / updated on check-in entry
- **Zero-Data / Null Interpretation**: `null` if goal has never had a check-in; UI displays "No check-ins yet".

---

### 3.6 Reviews Snapshot Metrics

#### `REVIEW_DAILY_STREAK_DAYS` — Daily Review Completion Streak
- **Name**: Daily Review Completion Streak (Days)
- **Formula**: Count of consecutive past local days ending at current date or yesterday with a finalized `DailyReview` record.
- **Source**: `reviews` table (`period_type = 'DAILY'`, `status = 'FINALIZED'`)
- **Grain**: Daily per Account
- **Timezone**: Account IANA timezone
- **Exclusions**: Unfinalized or skipped reviews
- **Rounding**: Integer days
- **Freshness**: Calculated upon review finalization or day rollover
- **Zero-Data / Null Interpretation**: `0` indicates no active streak.

#### `REVIEW_SNAPSHOT_METRICS` — Immutable Review Snapshot Metrics
- **Name**: Review Snapshot Metrics JSON
- **Formula**: Immutable snapshot record captured at review finalization containing:
  - `tasksCompleted`: Count of tasks completed during review period
  - `focusMinutesActual`: Total actual focus time (minutes)
  - `goalsProgressDelta`: Aggregate progress delta across active goals
  - `habitsScore`: Habit execution percentage
- **Source**: `reviews.snapshot_data` (Flyway V21 JSON schema)
- **Grain**: Snapshot frozen per finalized Daily/Weekly/Monthly Review
- **Timezone**: Account IANA timezone active at finalization time
- **Exclusions**: Modifiable post-finalization live data (snapshots are strictly immutable)
- **Rounding**: Integer counts & 1-decimal percentages as recorded
- **Freshness**: Permanently frozen upon finalization (never recalculated)
- **Zero-Data / Null Interpretation**: Explicitly stored values per snapshot schema.

---

## 4. Cross-System Consistency Rules

1. **Dashboard vs Export Consistency**: Every report table, progress chart, and CSV export MUST yield identical values for the same date range and timezone.
2. **Formula Reuse**: Multi-day or multi-project report aggregations MUST sum or average daily metrics defined in this dictionary rather than reinventing underlying filters.
3. **Audit Logging**: Any future modification to formulas, sources, or rounding rules in this document MUST bump the document version (`MAJOR.MINOR.PATCH`) and record an entry in `docs/CHANGELOG.md` and `docs/10-DECISIONS.md`.
