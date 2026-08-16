# LifeOS product specification

Status: planning baseline 1.0  
Owner: Partha  
Production: `https://buildwithpartha.tech/life-os`

This specification turns the supplied reference screens and product ideas into an original, buildable LifeOS contract. “Must” means required for the first production release unless the section is explicitly marked Future.

## 1. Vision and goals

LifeOS is the trusted daily control center for one person's commitments, time, focus, knowledge, routines, and reflection. It should reduce planning overhead, show the next useful action, and turn activity into honest progress without becoming another source of guilt.

Goals:

- connect projects, tasks, time, goals, notes, and habits through shared data;
- make Today and the current week understandable within seconds;
- support planning, execution, and review as one loop;
- protect highly personal information by default;
- remain useful with small amounts of data and scale to years of history;
- provide clean export and deletion so the user owns their data.

Non-goals for v1: teams, public sharing, billing, native apps, autonomous AI actions, and perfect offline collaboration.

## 2. Product principles

1. Private by default. Nothing is public or shared unless a later feature makes that choice explicit.
2. One source of truth. A task scheduled in a time block is the same task, not a copied record.
3. Plan realistically. Capacity, conflicts, overdue work, and unfinished carry-over are visible.
4. Action before decoration. Every screen answers “what can I do next?”
5. Calm honesty. Progress is factual; no shame, fake streak pressure, or manipulative gamification.
6. Capture quickly, organize later. Brain Dump and Quick Add minimize interruption.
7. Review closes the loop. Daily, weekly, and monthly reviews turn data into decisions.
8. Accessible and responsive. Core workflows work with keyboard, assistive technology, zoom, and small screens.
9. Recoverable by design. Undo, archive, soft delete, version checks, and backups reduce irreversible mistakes.
10. User-controlled intelligence. AI may suggest; the user reviews and confirms every change.

## 3. User personas

### Primary — Independent builder

A solo developer/creator balancing product work, learning, personal administration, health, and long-term goals. Needs one system for selecting priorities, protecting focus time, and reviewing progress.

### Secondary — Structured professional

Manages several projects and recurring responsibilities. Values deadlines, weekly planning, reports, search, and dependable reminders.

### Secondary — Habit and reflection user

Starts with habits, notes, and reviews, then gradually adopts projects and time blocking. Needs gentle onboarding and useful empty states.

Accessibility persona: any user may rely on keyboard navigation, screen reader, magnification, reduced motion, or high contrast. Accessibility is not a separate audience or later polish phase.

## 4. Information architecture

LifeOS has four conceptual groups:

- Execute: Today, Tasks, Time Blocks, Focus.
- Plan: Projects, Sprints, Week Planner, Calendar, Goals.
- Capture and grow: Notes, Brain Dump, Habits.
- Reflect: Progress, Reports, Daily/Weekly/Monthly Reviews.

Global services—Search, Notifications, Quick Add, Settings, Help, Account—are available throughout the protected application.

URLs remain stable and bookmarkable. Selection state with lasting meaning belongs in the URL; temporary UI state such as an open tooltip does not.

## 5. Navigation

Desktop uses a persistent left navigation and a compact top utility bar. Tablet may collapse the rail. Mobile uses a menu drawer and bottom-safe primary actions.

Requirements:

- LifeOS wordmark returns to Today.
- Active route is visually and programmatically indicated.
- Global Quick Add supports task, project, time block, note, brain-dump item, habit entry, and goal check-in.
- Search, notifications, focus state, and account menu are reachable from every protected screen.
- Unsaved forms warn before navigation when data would be lost.
- Keyboard users can skip navigation and reach main content.

## 6. Dashboard — Today

Purpose: orient the user and present a realistic plan for the current local day.

Must show:

- greeting, local date, short contextual line;
- today's MIT, tasks due/today, scheduled/focus minutes, active projects, and progress summary;
- time-block schedule with conflict/gap visibility;
- current sprint and current-week progress;
- next recommended action after the MIT;
- quick capture and daily review status;
- overdue items without allowing them to dominate the whole screen.

The user can set/change MIT, complete tasks, start focus, add/resize a time block, snooze a reminder, and open source records. Widgets with no data show one helpful action. The dashboard must not duplicate business logic; it consumes shared project/task/time/report services.

## 7. Projects module

Purpose: manage finite outcomes with tasks, milestones, dates, and health.

List capabilities: create, search, filter, sort, paginate, choose table/card view, favorite, archive, restore, and inspect in a details panel. Summary metrics cover total, active, completed, on-hold, overdue/at-risk, and overall progress.

Project fields: name, description, status, priority, health, icon/color, owner (current user in v1), start date, deadline, estimate, labels, milestones, and archived state.

Rules:

- Project progress is derived from weighted or count-based tasks according to one documented project setting.
- Completing/archiving a project never silently deletes unfinished tasks.
- Deadline and health changes appear in activity history.
- Projects with deleted dependencies or labels remain readable with safe fallbacks.

## 8. Project details

Tabs: Overview, Tasks, Timeline, Files, Notes, Activity.

Overview includes metrics, task breakdown, priority breakdown, top tasks, milestones, recent activity, description, labels, and project health. Tasks tab provides project-scoped task management. Timeline shows milestones and dated work. Files/Notes/Activity use shared services rather than separate content silos.

Edits use optimistic concurrency. A stale edit produces a conflict message and reload/compare choice, never a silent overwrite.

## 9. Tasks module

Purpose: hold actionable work and its execution state.

Capabilities: create, edit, duplicate, move status, prioritize, set MIT, schedule, add subtasks/dependencies/labels/attachments/comments, track time, recur, archive/delete/restore, bulk update, search/filter/sort, and paginate or virtualize large result sets.

Default statuses: To Do, In progress, Blocked, Done, Cancelled. Priorities: P1 — High, P2 — Medium, P3 — Low, P4 — Someday. Overdue is derived, not stored as a status.

Rules:

- A completed task cannot remain the active MIT.
- A blocked task clearly identifies unresolved blockers.
- Completing a recurring occurrence schedules the next occurrence idempotently.
- Projectless tasks are allowed and appear in Inbox/All Tasks.
- Bulk actions report partial failures without losing successful changes.

## 10. Task details

The detail experience includes title/status, project, priority, due date, estimate/time spent, progress, labels, description, checklist/subtasks, dependencies, schedule blocks, attachments, comments, activity, and focus shortcut.

Desktop uses a side panel where space permits; mobile uses a full route/sheet. Deep links open the exact task. Closing returns focus and preserves list filters/scroll.

## 11. Time Block module

Purpose: reserve real time for work, breaks, personal activities, and reviews.

Day/week views support create, drag, resize, duplicate day, reset draft day, mark done, link task/project, categorize, and start focus. Summary shows focus, break, personal, and unscheduled time.

Rules:

- Blocks use instants plus source timezone and handle DST gaps/duplicates explicitly.
- Overlaps are detected before save; policy allows cancel, edit, or intentional override.
- Resizing across midnight is either rejected with guidance or represented as two blocks according to the accepted ADR.
- Changes made while a focus session is active preserve session history.

## 12. Sprint module

A sprint is a bounded personal commitment window with name, goal, start/end, status, capacity, committed tasks, and progress. The user can create, plan, start, edit scope, complete, and review a sprint.

Scope changes after start are logged. Carry-over is an explicit review decision. Sprint completion produces committed/completed/removed/added counts and a short retrospective.

## 13. Week Planner

Purpose: balance commitments against available time before the week becomes urgent.

The planner shows seven local dates, planned focus time, task counts, time blocks, weekly goals, capacity, rollover candidates, and conflicts. Users can drag unscheduled tasks into days, set weekly outcomes, adjust capacity, and publish/finalize the plan.

The plan remains editable but records major changes after review. Week-start preference is respected.

## 14. Calendar

Day, week, and month views combine time blocks, task due dates, milestones, habit reminders, and review events with filters. The first release is the LifeOS calendar only; external calendar sync is future.

Selecting an item opens its true source record. All-day and timed entries remain distinct. Dense days provide an accessible “more” list.

## 15. Goals

Goals connect long-term outcomes to projects, tasks, habits, and check-ins. Supported progress types: percentage, numeric target, milestone, and binary. A goal has title, category, motivation/description, target, target date, status, and check-in cadence.

Users can create, edit, pause, complete, archive, check in, and see linked work. Goal progress derived from linked records must clearly say how it was calculated.

## 16. Notes

Private notes support title, plain/Markdown body, labels, pin, archive, search, autosave status, and links to projects/tasks/goals. Rich text is deferred until its security and portability tradeoffs are approved.

Autosave must distinguish Saving, Saved, Offline/Queued, Conflict, and Failed. Revision history is a future capability unless needed for sync conflict recovery.

## 17. Brain Dump

The fastest capture surface: text first, optional voice/file later. Items enter an unprocessed inbox and can be converted to a task, project idea, note, goal, or deleted/archived.

Conversion is transactional and leaves a trace to the created record. Batch triage supports convert, defer, archive, and delete.

## 18. Habits

Habits support daily or selected-day cadence, target count, reminder, color/icon, pause/archive, and local-date entries. Views show today, streak, consistency, calendar, and trend.

Streak calculations use the user's timezone and must not punish paused periods. Editing past entries is allowed and audited in activity. The product emphasizes consistency rather than shame.

## 19. Reports and analytics

Reports cover productivity overview, task completion, planned versus actual focus, project progress, habit consistency, goal progress, and review completion. Filters include date range, project, label, and category.

Every chart has numbers and an accessible summary. Users can export CSV; PDF is included only after layout and privacy QA. Reports never imply causal conclusions unsupported by data.

## 20. Focus Mode

Default cycles are configurable (for example 25/5) without calling one method universally optimal. A session can attach to a task/time block, start, pause, resume, skip break, complete, or cancel with reason.

The timer uses monotonic elapsed-time calculation rather than trusting interval ticks. Refresh/reconnect restores active state from the server. Only transitions—not every second—are announced to assistive technology. Notifications require explicit browser permission.

## 21. Search

Global search covers the authenticated user's projects, tasks, notes, brain-dump items, goals, and habits. Results are grouped by type, highlight safe text, and support keyboard navigation and recent searches stored as a user preference.

Search never crosses accounts. Sensitive bodies are not logged. Empty queries show recent/quick destinations; no-result states suggest filters and Quick Add.

## 22. Notifications

In-app notifications cover due/overdue items, block/focus reminders, habit reminders, review prompts, security events, and completed background jobs. Users can mark read/unread, clear eligible items, open the source, and set per-category preferences/quiet hours.

Email is required for identity security and optional for productivity reminders. Browser push is future unless explicitly pulled into scope.

## 23. Daily review

Morning review: choose MIT, inspect schedule, confirm priorities, and resolve conflicts. Evening review: record wins, complete/reschedule unfinished work, capture learning, and preview tomorrow.

Reviews may be skipped without losing access. Completion stores structured answers and a timestamp. Defaults take 5–10 minutes.

## 24. Weekly review

Summarize completed/carried/overdue tasks, focus plan versus actual, project health, goals, habits, and inboxes. Guide the user through cleanup, reflection, next-week outcomes, and capacity planning.

The user can save a draft and resume. Finalization snapshots metrics so future calculation changes do not rewrite the historical review.

## 25. Monthly review

Aggregate the month by outcomes, time allocation, projects, goals, habits, and lessons. The user records highlights, challenges, stop/start/continue decisions, and next-month themes.

Month boundaries follow user timezone. Missing weeks are shown honestly rather than interpolated.

## 26. Recurring tasks

Support daily, weekly, monthly, selected weekday, interval, end date/count, and “after completion” recurrence. Store the recurrence definition separately from occurrences.

Editing offers “this occurrence”, “this and future”, or “entire series” where valid. Generation is idempotent and DST-aware. Deleted/skipped occurrences do not unexpectedly reappear.

## 27. Dependencies

Tasks may block other tasks. Prevent self-dependency and cycles. A blocked task lists blockers and may transition automatically to To Do when all blockers complete only if the user enables that behavior.

Dependency changes are authorized, transactional, and included in activity.

## 28. Labels

One shared per-user label system applies to projects, tasks, notes, goals, and other approved records. Labels have unique normalized names and accessible colors. Renaming updates references; deleting prompts for replacement or removal.

Avoid a second synonymous “tags” entity in v1. UI copy may say “Labels”; API/domain uses `Label` consistently.

## 29. Priorities

P1 — High, P2 — Medium, P3 — Low, P4 — Someday. Priority is independent of due date and derived urgency. Views may show an urgency warning but never silently change priority.

Priority colors always include text/icon labels so color is not the only signal.

## 30. Attachments

V1 attachments are optional and must be feature-flagged until storage tickets are complete. Constraints include allowed types, size/count quotas, virus scanning, randomized object keys, private authorization on every download, safe content disposition, and deletion lifecycle.

Metadata lives in PostgreSQL; binary objects live in S3-compatible private storage on/for the VPS. Do not store arbitrary files in the database or public web root.

## 31. Comments

V1 comments are personal activity notes on tasks/projects, not collaboration. Plain text/Markdown subset, edit/delete own comment, timestamps, and activity entry. Mentions, threads, and team visibility are future.

## 32. Activity log

Human-readable history for important user actions: create/update/status/priority/date/assignment, conversions, attachment/comment changes, scope changes, and destructive actions. Security audit events are stored separately from product activity when their retention/access rules differ.

Activity metadata is structured and safe; do not store whole sensitive before/after bodies.

## 33. Team support — Future

Future architecture may introduce workspace, membership, role, assignment, sharing, mention, and invitation domains. No v1 query may assume team access. The v1 `user_id` ownership model should migrate cleanly to a workspace boundary through a planned migration, not premature hidden team logic.

## 34. AI features — Controlled future

Candidate assistive features:

- turn brain-dump text into proposed tasks/projects;
- propose daily/weekly plans from user-selected items and capacity;
- summarize a review or project activity;
- suggest task breakdowns, labels, estimates, or conflict resolutions;
- natural-language search over the user's own data.

Rules: opt-in, transparent provider/model, minimum necessary data, no training without explicit agreement, no silent writes, preview/diff before confirmation, easy undo, source links, uncertainty language, usage/cost controls, prompt-injection defenses for attachments, retention controls, and a non-AI path for every core workflow.

AI is not a v1 launch dependency. Its data flow and privacy impact require a dedicated ADR and threat model.

## 35. Database design

The conceptual entities and invariants are in `04-DOMAIN-MODEL.md`. Physical design requirements:

- PostgreSQL UUID keys, UTC `timestamptz`, explicit local date columns where domain meaning is date-only;
- foreign keys and check constraints for structural rules;
- `user_id`-leading indexes for high-volume ownership queries;
- partial indexes for active/non-deleted records where justified by measured queries;
- optimistic `version` on collision-sensitive aggregates;
- forward-only Flyway migrations with expand/migrate/contract for risky changes;
- seed data only in development/test;
- tested backup, point-in-time expectations, and deletion/export workflows.

## 36. API documentation

`05-API-CONVENTIONS.md` is binding. OpenAPI documents every endpoint, auth requirement, CSRF behavior, request/response example, pagination/filter/sort, error code, and rate-limit behavior. API changes are backward-compatible within v1 or versioned through a recorded decision.

## 37. State management

- Server state: TanStack Query with domain query keys, cancellation, invalidation, retries limited by error type, and no duplicate hidden caches.
- Form state: local/React Hook Form; server validation maps to fields and form summary.
- Global ephemeral state: minimal store for navigation, command palette, active timer display, and queued toasts.
- URL state: filters, sort, pagination, date/view, selected record when shareable/bookmarkable.
- Persistent preferences: backend when cross-device; localStorage only for non-sensitive device-specific presentation choices.

## 38. Offline support

V1 is resilient, not fully offline-first:

- installable shell and cached static assets are optional launch goals;
- already-loaded read views may remain visible with a clear offline banner and last-updated time;
- note/brain-dump drafts and safe idempotent creates may queue locally after the dedicated queue tickets;
- destructive operations, auth changes, file uploads, recurrence edits, and complex bulk actions require connectivity;
- never claim Saved until the server acknowledges, unless the UI explicitly says Queued offline.

## 39. Sync strategy

The backend is authoritative. Each mutable record has version/update metadata. Online writes use optimistic UI only when reversible; conflicts receive a `409`/precondition response and offer reload, compare, or copy-my-changes.

Offline mutation queue entries include stable client IDs, idempotency keys, dependency order, attempt state, and expiry. Replay is sequential per entity and safe across refresh. Server time remains authoritative; client clock is presentation input only.

## 40. Security

`06-SECURITY.md` is binding. Additional product requirements: privacy dashboard, session/device view, export account data, delete account, security notifications, terms/privacy acceptance version, and a documented incident response/restore path.

## 41. Settings

Sections:

- Profile: display name and avatar.
- Localization: timezone, locale, date/time format, week start.
- Planning: default work hours, focus/break durations, capacity, default task/project settings.
- Notifications: channels, categories, quiet hours.
- Appearance/accessibility: theme, density, reduced motion preference, contrast preference where useful.
- Security: change password, active sessions, sign out all, security history.
- Data: export, import (future until mapped), retention, delete account.

Invalid timezone/locale values fall back safely and prompt correction.

## 42. Edge cases

Every applicable module tests: DST start/end, timezone change, leap day, month/year boundary, midnight crossing, deleted/archived parent, stale update, duplicate submission, retry after timeout, partial bulk failure, large lists, extremely long text, Unicode/emoji/RTL text, unavailable attachment, expired session during edit, revoked permissions, storage/database/email outage, and restored soft-deleted records.

## 43. Error states

Error messages say what happened, what was preserved, and what the user can do. Categories: field validation, permission, not found/deleted, conflict, offline, rate limited, service unavailable, and unexpected failure with correlation ID. Never expose stack traces. Preserve safe user input across recoverable failures.

## 44. Empty states

Each empty state contains a plain explanation and one primary action. Distinguish first-use empty, filtered no results, search no results, permission unavailable, and data failed to load. Do not show fake data as if it were real.

## 45. Loading states

Use immediate control feedback, reserved layout space, skeletons for structured content, progress only when meaningful, and cancellable status for long exports/uploads. Do not block the whole screen for one widget. Avoid skeletons that look like real interactive controls to assistive technology.

## 46. UX guidelines

- Primary action placement is consistent by screen family.
- Use progressive disclosure for advanced fields.
- Confirm irreversible/destructive operations with the exact object name and consequence.
- Prefer undo for reversible operations.
- Keep filters visible as removable chips and provide Clear all.
- Preserve list position/filter state when closing details.
- Use optimistic UI only with visible rollback on failure.
- Relative dates supplement, not replace, absolute dates.
- Avoid horizontal scrolling for core mobile workflows.

## 47. Design system, color, typography, icons, and animation

`03-DESIGN-SYSTEM.md` is binding. Use one coherent outline icon set with accessible labels for icon-only controls. Do not mix emoji with product icons except user-authored content. Animation duration is usually 120–240ms, communicates spatial/state change, never blocks input, and is removed/reduced under `prefers-reduced-motion`.

## 48. Accessibility

Target WCAG 2.2 AA. Include keyboard-only acceptance criteria in each interactive ticket, semantic landmarks/headings, correct dialog/menu/grid behavior, accessible forms/errors, non-color status cues, 200% zoom, 320px reflow, screen-reader announcements that do not spam, chart alternatives, touch targets, and automated plus manual testing.

## 49. Acceptance criteria policy

Acceptance criteria must be observable, cover positive and negative behavior, name user ownership/security, and include relevant loading/empty/error/offline/conflict/responsive/accessibility states. Screen tickets cannot restate vague design goals; they reference completed component contracts and exact API behavior.

## 50. QA test policy

Use a risk pyramid: unit tests for domain/component behavior, API integration tests with PostgreSQL/Testcontainers, contract tests, component accessibility tests, and a focused Playwright suite for critical journeys. Manual exploratory sessions cover responsive behavior, assistive technology, timezone/DST, failure injection, and visual comparison.

Critical E2E journeys:

1. Signup -> verify -> login -> onboarding -> Today.
2. Project -> task/subtask -> dependency -> schedule -> focus -> complete.
3. Daily plan/review and weekly plan/review.
4. Recurrence through timezone/DST boundary.
5. Offline draft/queued create -> reconnect -> sync/conflict.
6. Export data -> delete/recover or delete account.
7. Cross-user access attempts fail across every domain.

## 51. Development roadmap

The phase sequence in `08-DELIVERY-PHASES.md` is binding. The detailed ticket backlog is in `docs/backlog/`. Component tickets are hard dependencies for screen tickets. Each phase is merged from `develop` to `master` only after its review gate.

## 52. Future features

Teams/workspaces, assignments, sharing, comments/mentions, external calendar sync, browser/mobile push, native apps, full offline-first mode, version history, templates, automation rules, public API/webhooks, imports from common task apps, richer attachments, voice capture, controlled AI, billing/tiers if ever needed, and a plugin ecosystem.

Future does not mean promised. Each item requires discovery, privacy/security assessment, architecture decision, and its own release plan.
