# Domain model

All user-owned entities include `id`, `user_id`, `created_at`, `updated_at`, and where relevant `deleted_at` and `version`.

Canonical entity names, statuses, priorities, UI labels, API resources and PostgreSQL base names are defined in [LifeOS product vocabulary](./29-PRODUCT-VOCABULARY.md). This model must not introduce synonyms or a cross-entity generic status enum.

## Identity

- `User`: email, normalized email, display name, timezone, locale, week start, account status, verified timestamp.
- `Credential`: user, password hash, password changed timestamp.
- `UserSession`: hashed token, user, CSRF secret, created/last-seen/expiry/revoked timestamps, device metadata.
- `EmailVerificationToken` and `PasswordResetToken`: hashed single-use token, user, expiry, consumed timestamp.

## Work management

- `Project`: name, description, status, priority, health, color/icon, start/deadline, estimate, archived flag.
- `Milestone`: project, title, date, status, ordering.
- `Task`: optional project, optional goal, title, description, status, priority, due timestamp/date, estimate minutes, spent minutes, progress, optional MIT local date, position, recurrence rule.
- `Subtask`: task, title, completed, position.
- `Label`, `TaskLabel` and `ProjectLabel`: user-defined classification and explicit entity links.
- `TaskDependency`: blocking task -> blocked task.
- `Attachment`: authorized metadata/storage reference for a supported owning entity; schema/storage implementation is separately gated.

## Planning and focus

- `TimeBlock`: title, category, optional task/project, start/end instants, timezone, status, color, notes.
- `FocusSession`: optional task/Time Block, planned/actual duration, started/paused/completed timestamps, interruptions, status and focus/break phase.
- `DailyTimeSummary`: read-only, non-persisted projection of completed Focus Session time, local-day-clipped Time Block allocation, optional daily target and labelled planned-versus-actual denominator.
- `Sprint`: name, optional goal, inclusive start/end local dates, status, target capacity points, immutable completion counts/points, retrospective fields, completion timestamp and optimistic version.
- `SprintTask`: Sprint, owned Task, story points, ordering, commitment timestamp, after-start flag, optional removal timestamp and optional carry-over destination. Removal preserves history rather than deleting the commitment.
- `SprintEvent`: immutable Sprint lifecycle, goal, capacity and scope history with optional Task, points delta, reason and UTC occurrence timestamp.
- `WeeklyPlan`: Account-local week start/end, IANA timezone and ISO week-start snapshots, revision/predecessor identity, Draft/Finalized status, finalization timestamp, optimistic version and immutable finalized warning snapshot.
- `WeeklyPlanCapacity`: Weekly Plan, one of its seven local dates and zero-to-1,440 available minutes. Missing capacity input is stored explicitly as zero rather than inventing availability.
- `WeeklyPlanOutcome`: Weekly Plan, user-authored outcome title and ordering.
- `WeeklyPlanItem`: Weekly Plan, owned Task, optional Weekly Plan outcome, optional allocated local date, planned minutes, ordering and Task title/status snapshot.
- `Review`: period type (`DAILY_MORNING`, `DAILY_EVENING`, `WEEKLY`, `MONTHLY`), period key, start/end dates, timezone, status (`NOT_STARTED`, `DRAFT`, `FINALIZED`, `SKIPPED`), optional skip reason, finalized timestamp, prompt answers, item decisions, and frozen snapshot metrics.
- `ReviewAnswer`: prompt key and structured/freeform answer text.
- `ReviewItemDecision`: item type (`TASK`, `PROJECT`, `GOAL`), target item ID, action (`KEEP_FOR_TOMORROW`, `RESCHEDULE`, `RETURN_TO_BACKLOG`, `MARK_BLOCKED`, `COMPLETE`, `CANCEL`, `CONTINUE`, `PAUSE`, `ARCHIVE`), optional target date and notes.
- `ReviewSnapshotMetrics`: frozen snapshot of task completion, focus minutes, sprint velocity, project health, and daily review completion, with missing-data flags.


## Knowledge and growth

- `Goal`: title, description, category, target type/value/date, current value, status.
- `GoalCheckIn`: goal, value, note, recorded date.
- `Note`: title, body, pinned, archived.
- `BrainDumpItem`: body, captured timestamp, processed timestamp, converted entity type/id.
- `Habit`: name, cadence, target count, color/icon, status and archived timestamp.
- `HabitEntry`: habit, local date, count, note.

## Supporting domains

- `Notification`: type, title, body, target URL, read timestamp.
- `ActivityEvent`: actor, action, entity type/id, user-readable safe metadata, timestamp.
- `AuditEvent`: actor, action, entity type/id, safe metadata, timestamp.
- `OutboxEvent`: type, payload, availability/processed/failure state.
- `UserPreference`: only preferences not represented by strongly typed user columns.

## Invariants

- A user cannot reference another user's project, task, goal, label, or schedule item.
- Non-cancelled Sprints for one Account cannot overlap on inclusive local dates, and an Account has at most one Active Sprint. Account-row locking serializes overlap and active-state decisions; optimistic versions reject stale mutations.
- Completed and Cancelled Sprints are terminal. Completion snapshots active commitment, completion, added, removed, carry-over and story-point metrics before optional transactional carry-over to an owned Planned Sprint.
- A Weekly Plan's local week identity is derived from the Account's saved timezone/week-start settings at creation and retained across revisions. One editable Draft may exist per Account/week; a Finalized revision is immutable, and Reopen creates a successor rather than rewriting history.
- Weekly Plan Task links are same-owner at both service and database boundaries. Finalization refreshes Task title/status and freezes the live capacity, Time Block overlap, unscheduled-item and outcome coverage summary; warnings do not silently remove work or prevent an intentional finalization.
- End time is after start time; invalid or overlapping Time Blocks are rejected or explicitly overridden according to policy.
- One Task can be the MIT for a given local date; changing it atomically clears the prior MIT.
- Completed subtasks and task progress remain consistent under the defined progress mode.
- Archived/deleted parents do not expose active children in normal queries.
- Recurrence creates occurrences idempotently in the user's timezone.
