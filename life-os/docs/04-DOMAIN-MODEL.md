# Domain model

All user-owned entities include `id`, `user_id`, `created_at`, `updated_at`, and where relevant `deleted_at` and `version`.

## Identity

- `User`: email, normalized email, display name, timezone, locale, week start, account status, verified timestamp.
- `Credential`: user, password hash, password changed timestamp.
- `UserSession`: hashed token, user, CSRF secret, created/last-seen/expiry/revoked timestamps, device metadata.
- `EmailVerificationToken` and `PasswordResetToken`: hashed single-use token, user, expiry, consumed timestamp.

## Work management

- `Project`: name, description, status, priority, health, color/icon, start/deadline, estimate, archived flag.
- `Milestone`: project, title, date, status, ordering.
- `Task`: optional project, optional goal, title, description, status, priority, due timestamp/date, estimate minutes, spent minutes, progress, MIT flag, position, recurrence rule.
- `Subtask`: task, title, completed, position.
- `Label` and `TaskLabel`: user-defined classification.
- `TaskDependency`: blocking task -> blocked task.
- `ProjectAttachment`: metadata only in initial schema; storage implementation is separately gated.

## Planning and focus

- `TimeBlock`: title, category, optional task/project, start/end instants, timezone, status, color, notes.
- `FocusSession`: optional task/time block, planned/actual duration, started/paused/completed timestamps, interruptions, status.
- `Sprint`: name, goal, start/end dates, status.
- `SprintTask`: sprint, task, ordering, committed flag.
- `WeeklyPlan`: week start, target focus minutes, review status.
- `WeeklyPlanItem`: plan, optional task/goal, type, target, ordering.

## Knowledge and growth

- `Goal`: title, description, category, target type/value/date, current value, status.
- `GoalCheckIn`: goal, value, note, recorded date.
- `Note`: title, body, pinned, archived.
- `BrainDumpItem`: body, captured timestamp, processed timestamp, converted entity type/id.
- `Habit`: name, cadence, target count, color/icon, active.
- `HabitEntry`: habit, local date, count, note.

## Supporting domains

- `Notification`: type, title, body, target URL, read timestamp.
- `AuditEvent`: actor, action, entity type/id, safe metadata, timestamp.
- `OutboxEvent`: type, payload, availability/processed/failure state.
- `UserPreference`: only preferences not represented by strongly typed user columns.

## Invariants

- A user cannot reference another user's project, task, goal, label, or schedule item.
- End time is after start time; invalid or overlapping blocks are rejected or explicitly overridden according to policy.
- One task can be the MIT for a given local date; changing it atomically clears the prior MIT.
- Completed subtasks and task progress remain consistent under the defined progress mode.
- Archived/deleted parents do not expose active children in normal queries.
- Recurrence creates occurrences idempotently in the user's timezone.

