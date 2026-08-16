# LifeOS product vocabulary

Ticket: LOS-0111

This is the canonical naming contract for LifeOS. UI copy, TypeScript and Java names, JSON fields, API resources, PostgreSQL identifiers, tests, fixtures and documentation must use these concepts consistently. A later change requires updating this document and every affected contract in the same ticket; a synonym must not silently become a second concept.

## Naming layers

| Layer | Convention | Example |
| --- | --- | --- |
| UI destination/entity | Natural English; destination labels in title case, ordinary copy in sentence case | `Time Blocks`, `Add time block` |
| TypeScript/Java type | PascalCase singular | `TimeBlock` |
| TypeScript/Java member and JSON | camelCase | `timeBlockId`, `weekStart` |
| API collection/path | lowercase kebab-case plural | `/time-blocks`, `/weekly-plans` |
| PostgreSQL table/column | lowercase snake_case; table singular unless a migration ADR changes the global rule | `time_block`, `weekly_plan_id` |
| Stored enum | uppercase snake case | `IN_PROGRESS` |
| UI enum label | localized natural language | `In progress` |

Raw enum keys, database names and Java class names never appear in user-facing copy. API paths remain under `/life-os/api/v1`; UI routes remain under `/life-os`.

## Core entity dictionary

| UI term | Definition and boundary | Code type | API collection | Database base name | Do not call it |
| --- | --- | --- | --- | --- | --- |
| Project | A user-owned outcome container that groups related tasks, milestones, notes and planning context. A project may exist without a deadline. | `Project` | `/projects` | `project` | workspace, board, initiative |
| Milestone | A dated checkpoint belonging to one project. It is not a task and does not record work time. | `Milestone` | `/projects/{projectId}/milestones` | `milestone` | task, event |
| Task | A concrete action the user may prioritize, schedule, focus on and mark done. It may be projectless. | `Task` | `/tasks` | `task` | to-do item, card, ticket |
| Subtask | A small ordered action belonging to one task. The UI may introduce the group as a checklist, but each persisted row is a Subtask. | `Subtask` | `/tasks/{taskId}/subtasks` | `subtask` | checklist item in API/DB, child task |
| Task dependency | A directional relationship in which one task blocks another. It is not a hierarchy. | `TaskDependency` | `/tasks/{taskId}/dependencies` | `task_dependency` | parent task, linked task |
| Time Block | A reserved start/end interval in the user's schedule, optionally linked to a task or project. | `TimeBlock` | `/time-blocks` | `time_block` | block, event, appointment |
| Focus Session | One server-authoritative record of focused time, optionally linked to a task and/or Time Block. | `FocusSession` | `/focus-sessions` | `focus_session` | timer, pomodoro record |
| Sprint | A bounded personal commitment window with a goal, dates, capacity and committed tasks. | `Sprint` | `/sprints` | `sprint` | week, project phase |
| Weekly Plan | The user's plan, outcomes, allocations and capacity decisions for one timezone-aware week. | `WeeklyPlan` | `/weekly-plans` | `weekly_plan` | week planner record, sprint |
| Goal | A longer-horizon outcome with an explicit progress type, optional target and linked work. | `Goal` | `/goals` | `goal` | project, objective record |
| Goal Check-in | A dated update to one goal's progress/value and optional note. | `GoalCheckIn` | `/goals/{goalId}/check-ins` | `goal_check_in` | status update, review |
| Note | A durable titled body of private reference or thinking content. | `Note` | `/notes` | `note` | document, brain dump |
| Brain Dump Item | A quickly captured private thought awaiting deliberate conversion, deferral or archive. Brain Dump is the destination; Brain Dump Item is the record. | `BrainDumpItem` | `/brain-dump-items` | `brain_dump_item` | note, inbox task |
| Habit | A repeatable behavior definition with cadence and target count. | `Habit` | `/habits` | `habit` | recurring task, routine task |
| Habit Entry | The count/note recorded for one habit on one local date. | `HabitEntry` | `/habits/{habitId}/entries` | `habit_entry` | completion task, check-in without context |
| Review | A structured daily, weekly or monthly reflection with answers, decisions and an immutable finalized snapshot. | `Review` | `/reviews` | `review` | report, plan |
| Label | A user-defined, reusable classification attached to supported records. Labels do not imply priority, status or hierarchy. | `Label` | `/labels` | `label` plus entity link tables | tag, category |

## Experiences and projections that are not records

| Term | Meaning |
| --- | --- |
| Today | The date-aware dashboard composed from canonical tasks, Time Blocks, focus, plans, projects and reviews. It does not own duplicate copies of those records. |
| Week Planner | The screen and interaction experience used to create/edit a Weekly Plan. The persisted entity is Weekly Plan. |
| Focus Mode | The distraction-reduced experience that controls a Focus Session. Configurable focus/break cycles may follow a Pomodoro-style method, but Pomodoro is not an entity or universal claim. |
| Brain Dump | The capture and triage destination containing Brain Dump Items. |
| Progress | A concise overview of calculated trends and current measures. It is not a stored score or record type. |
| Reports | Filtered, explainable analysis and exports computed from canonical records. A report must not create a second source of truth. |
| Calendar | A date-based projection of Time Blocks, due tasks, milestones, habits and reviews. Selecting an item opens its source record. |
| Quick Add | A global creation experience. It invokes canonical create services and does not create a separate Quick Add record. |
| Notification center | The screen/drawer that presents Notification records. |
| Activity | Human-readable product history. Security Audit Events remain a separate protected record and retention domain. |

## Supporting terms

| Term | Canonical meaning |
| --- | --- |
| Account | The user's authentication and lifecycle boundary. UI says Account; backend identity type remains `User`. |
| Profile | User-editable display and localization settings belonging to the Account; not a separate person/account. |
| Comment | A user-authored discussion entry attached to one supported record. In v1 comments are private to the owning account even if future team support is planned. |
| Attachment | File metadata and authorized storage reference attached to one supported record when the gated file capability is enabled. |
| Notification | A private in-app message with a category, read state and optional canonical target. |
| Activity Event | A user-readable record of a meaningful product change. |
| Audit Event | A restricted security/administrative record. It is never exposed as ordinary Activity without a safe projection. |
| Recurrence Rule | The timezone-aware rule that generates occurrences. A recurring task is still a Task; each occurrence is uniquely and idempotently identified. |
| Estimate | The user's expected effort duration, stored in minutes. It is not a deadline or elapsed time. |
| Time spent | Confirmed actual duration derived from Focus Sessions or explicit time records according to the feature contract. |
| Progress | A named calculation with numerator, denominator and no-data behavior. It is not interchangeable with status. |
| Deadline | The desired completion boundary for a Project or Goal. |
| Due date | The date/time by which a Task is intended to be done. |
| Local date | A calendar date interpreted using the user's IANA timezone; never an implicit server/browser date. |
| MIT | “Most Important Task”: the single Task deliberately selected for one user-local date. MIT is not a priority value or permanent task status. |

## Status contract

“Status” is a field family, not one shared enum. A status value is always scoped to its entity. The UI must not combine unrelated values into one filter.

### Project status

| Stored value | UI label | Meaning |
| --- | --- | --- |
| `PLANNED` | Planned | Defined but not currently being executed. |
| `ACTIVE` | Active | Currently receiving work. |
| `ON_HOLD` | On hold | Intentionally paused with the outcome retained. |
| `COMPLETED` | Completed | Outcome intentionally completed. |
| `CANCELLED` | Cancelled | Stopped without completion. |

Archived is a lifecycle state, not Project status. Project health is also separate from status.

### Task status

| Stored value | UI label | Meaning |
| --- | --- | --- |
| `TO_DO` | To Do | Available or planned but not started. |
| `IN_PROGRESS` | In progress | Actively being worked on. |
| `BLOCKED` | Blocked | Cannot proceed because a named dependency or obstacle is unresolved. |
| `DONE` | Done | The action was completed. |
| `CANCELLED` | Cancelled | Intentionally stopped without completion. |

Overdue is derived from due date, local time and non-terminal status; it is never stored as Task status. Archived/deleted are lifecycle states. MIT is a dated designation. “Open tasks” collectively means To Do, In progress and Blocked unless a screen explicitly states another definition.

### Time Block status

| Stored value | UI label | Meaning |
| --- | --- | --- |
| `SCHEDULED` | Scheduled | Reserved and not yet started/completed. |
| `IN_PROGRESS` | In progress | Its linked execution is currently active. |
| `COMPLETED` | Completed | The scheduled interval was intentionally completed. |
| `CANCELLED` | Cancelled | The reservation was intentionally cancelled. |

Current, upcoming, past and conflict are derived views, not statuses.

### Focus Session status and phase

| Stored value | UI label | Meaning |
| --- | --- | --- |
| `RUNNING` | In focus / On break | Session clock is active; `phase` identifies `FOCUS` or `BREAK`. |
| `PAUSED` | Paused | Session clock is intentionally paused. |
| `COMPLETED` | Completed | Session finished and actual duration was recorded once. |
| `CANCELLED` | Cancelled | Session stopped without normal completion. |

Starting, pausing, resuming, completing and reconnecting are transient UI/request states, not stored status values.

### Sprint status

| Stored value | UI label |
| --- | --- |
| `PLANNED` | Planned |
| `ACTIVE` | Active |
| `COMPLETED` | Completed |
| `CANCELLED` | Cancelled |

Upcoming is derived from dates/status. Sprint scope changes are events, not statuses.

### Weekly Plan and Review status

| Entity | Stored value | UI label | Meaning |
| --- | --- | --- | --- |
| Weekly Plan | `DRAFT` | Draft | Editable planning decisions not yet finalized. |
| Weekly Plan | `FINALIZED` | Finalized | Reviewed plan snapshot for the week. |
| Review | `DRAFT` | Draft | Started and resumable. |
| Review | `FINALIZED` | Finalized | Immutable metric snapshot and decisions stored. |
| Review | `SKIPPED` | Skipped | Deliberately skipped without blocking LifeOS. |

Reopening a finalized Weekly Plan creates an editable successor revision; it never rewrites the finalized snapshot silently.

### Goal status

| Stored value | UI label |
| --- | --- |
| `NOT_STARTED` | Not started |
| `ACTIVE` | Active |
| `PAUSED` | Paused |
| `COMPLETED` | Completed |
| `CANCELLED` | Cancelled |

Goal progress type/value is independent from Goal status.

### Other lifecycle state

| Entity | Stored value/field | UI label | Rule |
| --- | --- | --- | --- |
| Milestone | `PLANNED` | Planned | Future/current checkpoint not completed or cancelled. |
| Milestone | `COMPLETED` | Completed | Checkpoint achieved. |
| Milestone | `CANCELLED` | Cancelled | Checkpoint intentionally stopped. |
| Brain Dump Item | `UNPROCESSED` | Unprocessed | Captured and awaiting triage. |
| Brain Dump Item | `DEFERRED` | Deferred | Deliberately retained for later triage. |
| Brain Dump Item | `CONVERTED` | Converted | Converted once with canonical destination linkage. |
| Habit | `ACTIVE` | Active | Habit currently accepts entries according to cadence. |
| Habit | `PAUSED` | Paused | Entry expectation is suspended without deleting history. |
| Note/Project/Task/Habit | `archivedAt` | Archived | Recoverable lifecycle state, not the entity's normal workflow status. |
| Notification | `readAt` | Read / Unread | Read state is a timestamp/null projection, not a generic status enum. |

A Brain Dump Item is archived through the shared lifecycle field rather than an `ARCHIVED` processing status. Milestone overdue is derived from its date and non-terminal status.

## Project health

Project health answers whether execution appears aligned with the intended outcome; it is not status or progress.

| Stored value | UI label |
| --- | --- |
| `ON_TRACK` | On track |
| `AT_RISK` | At risk |
| `OFF_TRACK` | Off track |
| `NOT_SET` | Not set |

Avoid subjective labels such as Excellent, Good, Average or Poor. Health may be user-set or transparently derived only after its calculation contract is approved.

## Product priority

Project and Task priority use the same deliberate importance scale:

| Stored value | UI label | Meaning |
| --- | --- | --- |
| `P1` | P1 — High | Highest deliberate importance. |
| `P2` | P2 — Medium | Normal planned importance. |
| `P3` | P3 — Low | Useful but lower importance. |
| `P4` | P4 — Someday | Intentionally deferred from normal commitment. |

Priority is independent from status, deadline, due date, overdue state and MIT. Urgency is derived from time/risk context and must never silently change priority.

Development-ticket priority is a repository workflow concept, not Product priority. It is never stored on a Project or Task and never shown in LifeOS product screens.

## Label contract

- The only taxonomy noun is Label. “Tag” is prohibited in product code/copy except when explaining migration from an external system.
- A Label belongs to one user and has a unique normalized name within that account.
- Display name preserves user casing; matching/uniqueness uses the normalized form.
- A Label may have an optional accessible color, but color is never its only identifier.
- Link tables name both concepts, for example `task_label` and `project_label`.
- Removing a Label from a record means unlink; deleting the Label itself requires explaining its account-wide effect.
- Categories are fixed domain-specific values (for example Time Block category), not synonyms for user-defined Labels.

## Canonical action verbs

| Verb/label | Use when | Do not imply |
| --- | --- | --- |
| Add [record] | Primary UI action that starts creation in a collection or Quick Add | Server confirmation has already occurred |
| Create account | Public signup completion action | The account is verified or signed in |
| Save | Persist edits without changing lifecycle status | Finalization/completion |
| Start | Begin a Sprint, Focus Session, Review or planning flow | Resume a paused record |
| Pause / Resume | Temporarily halt/continue an active supported record | Cancel or restart |
| Mark done | Move a Task to Done | Complete a Project/Sprint/Goal |
| Complete | Finish a Project, Time Block, Focus Session, Sprint or Goal according to its contract | Delete/archive |
| Cancel | Stop a planned/active record without completing it | Delete it |
| Schedule | Create/link a Time Block for work | Change Task status automatically unless specified |
| Reschedule | Change the date/time of already scheduled work | Duplicate it |
| Move | Change a record's location/day/order without changing duration | Resize or duplicate |
| Resize | Change Time Block start/end or duration | Move it without time change |
| Finalize | Lock a reviewed Weekly Plan or Review snapshot | Delete its draft history |
| Reopen | Create an editable successor/revision from finalized planning content | Mutate immutable history |
| Archive | Hide inactive content from normal views while retaining a recoverable record | Hard-delete |
| Restore | Return archived/soft-deleted recoverable content | Recreate a new record |
| Delete | Begin the documented deletion lifecycle | Archive or unlink |
| Remove | Remove an item from a collection or relationship when the item itself remains | Delete the underlying record |
| Link / Unlink | Add/remove a relationship between existing records | Create/delete either record |
| Skip | Deliberately record that a Review, Habit occurrence or break was not performed | Failure, cancellation or deletion |
| Defer | Keep a Brain Dump Item for later triage | Convert or archive it |
| Convert | Create a canonical destination from a Brain Dump Item and retain source linkage | Copy repeatedly |
| Duplicate | Create a new record with a new identity from selected source fields | Link to the same record |
| Set as MIT / Change MIT | Select/replace the Most Important Task for one local date | Raise Product priority |
| Check in | Record Goal progress | Finalize a Review or complete a Goal |
| Log habit | Create/update a Habit Entry for a local date | Complete a recurring Task |
| Sign in / Sign out | User-facing authentication actions | UI labels “log in/out”; API routes remain `/auth/login` and `/auth/logout` |

Use action-first sentence-case labels: `Add task`, `Start focus`, `Plan week`, `Mark done`, `Archive project`. Generic `Submit`, `OK`, `Yes`, `Manage`, `Process` and `Are you sure?` are not acceptable when a precise verb exists.

## Forbidden or context-limited synonyms

| Avoid | Use |
| --- | --- |
| Home | Today |
| tag | Label |
| block (schedule noun) | Time Block |
| event (LifeOS schedule noun) | Time Block or the exact source record |
| to-do item | Task |
| checklist item in API/DB | Subtask |
| focus timer / pomodoro record | Focus Session |
| week plan / planner record | Weekly Plan |
| objective (entity) | Goal |
| inbox item without context | Brain Dump Item |
| score (general productivity) | the named metric and calculation |
| completed task status | Done |
| done project/sprint/goal status | Completed |
| delete when recoverable hiding is intended | Archive |

“Block” remains valid as the verb in “Task A blocks Task B” and in engineering prose such as “blocks release.” “Review” remains valid for Git/product approval prose when context clearly is not a LifeOS Review record.

## Contract examples

### Task example

```text
UI: Add task -> Task “Prepare launch checklist” -> Mark done
API: POST /tasks, status IN_PROGRESS -> DONE, timeBlockId
Java/TypeScript: Task, TaskStatus.IN_PROGRESS, timeBlockId
Database: task.status = 'IN_PROGRESS'; time_block.task_id = task.id
```

### Weekly planning example

```text
UI: Week Planner -> Start plan -> Move task -> Finalize plan
API: POST /weekly-plans -> update Weekly Plan items -> finalize action
Java/TypeScript: WeeklyPlan, WeeklyPlanItem, WeeklyPlanStatus.FINALIZED
Database: weekly_plan, weekly_plan_item
```

### Capture example

```text
UI: Quick Add -> Brain Dump Item -> Convert to task
API: POST /brain-dump-items -> conversion action creates one /tasks resource
Java/TypeScript: BrainDumpItem -> Task with source linkage
Database: brain_dump_item.converted_entity_type/id references the created task identity
```

## Enforcement

- Feature tickets must use this vocabulary in acceptance criteria, UI copy, names and tests.
- OpenAPI schemas and generated frontend types must use canonical code names.
- Flyway review rejects alternate table/column/entity synonyms.
- Search for forbidden synonyms is part of documentation and UI-copy review; legitimate engineering/Git contexts are reviewed manually.
- If implementation reveals a missing concept, extend this glossary before introducing the name in code.
