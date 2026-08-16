# QA acceptance matrix

These are release-level cases in addition to ticket tests. IDs stay stable for test management.

## Identity and privacy

- QA-AUTH-001: New email signs up, receives one verification flow, verifies once, and reaches onboarding; token replay is harmless.
- QA-AUTH-002: Duplicate signup and unknown password-recovery requests return indistinguishable public responses.
- QA-AUTH-003: Login rejects unverified/disabled/invalid users safely and rate limits repeated failures.
- QA-AUTH-004: Session cookie has Secure/HttpOnly/SameSite/path attributes in production; frontend storage has no auth token.
- QA-AUTH-005: Logout and password reset revoke required sessions; back/refresh cannot recover private cached content.
- QA-AUTH-006: User B cannot infer or access any User A resource through ID, nested URL, filter, search, export, file, or activity.
- QA-AUTH-007: Export contains the documented User A data only; delete lifecycle follows grace/purge/backup policy.

## Navigation, shell, and states

- QA-UX-001: Every protected destination is keyboard reachable, has one main landmark/title, active nav, skip link, and logical focus on route change.
- QA-UX-002: At 320px and 200% zoom, core actions remain usable without page-level horizontal scroll.
- QA-UX-003: First-use, filtered-empty, search-empty, partial error, offline, 429, 5xx, expired-auth, conflict and success states match `12-UX-STATES.md`.
- QA-UX-004: Closing a details drawer returns focus and preserves list filters, page, selection and scroll.
- QA-UX-005: Reduced motion removes nonessential animation; forced colors/high contrast retain state meaning.

## Core execution

- QA-WORK-001: Create project, milestone and task; list/detail metrics agree and survive refresh.
- QA-WORK-002: Archive/complete a project with unfinished tasks follows the explicit chosen action; no task disappears silently.
- QA-WORK-003: Task subtasks update progress exactly once; stale concurrent edit produces conflict rather than overwrite.
- QA-WORK-004: Dependency cycles/self/cross-user edges are rejected; blocked status explains unresolved blockers.
- QA-WORK-005: MIT is unique per local date and clears when completed/deleted.
- QA-WORK-006: Bulk task action reports individual failures while preserving successful changes and selection context.
- QA-WORK-007: Labels rename/delete-replace consistently across linked records and keep accessible color/text.

## Time, focus, and calendar

- QA-TIME-001: Add/move/resize a Time Block; overlap prompts cancel/edit/explicit override and is consistent in Today/Calendar.
- QA-TIME-002: DST nonexistent and repeated local times show an explicit choice/error; stored/displayed instants remain correct.
- QA-TIME-003: Focus start/pause/background-tab/sleep/refresh/resume/complete reports accurate server-authoritative elapsed time once.
- QA-TIME-004: Two tabs cannot create two active focus sessions or double-complete one.
- QA-TIME-005: Day/week/month calendar source click opens the true entity; dense day overflow is keyboard/screen-reader usable.

## Planning and review

- QA-PLAN-001: Sprint scope before/after start and carry-over are logged; completed metrics reconcile with tasks.
- QA-PLAN-002: Weekly plan respects week start/timezone, detects overcapacity/conflicts, and provides keyboard alternatives to drag.
- QA-PLAN-003: Daily/weekly/monthly review draft resumes; finalize snapshots do not change after source records change.
- QA-PLAN-004: Review skip never blocks app access and is presented without guilt language.

## Knowledge, habits, recurrence

- QA-KNOW-001: Note autosave distinguishes Saving/Saved/Queued/Conflict/Failed and never loses both sides of a conflict.
- QA-KNOW-002: Brain-dump conversion retried after lost response creates one destination and links the source.
- QA-KNOW-003: Habit streak handles target counts, pause, late edits, timezone change, DST and no-DST zones deterministically.
- QA-REC-001: Recurring series creates each occurrence once through DST/month-end/leap-day boundaries.
- QA-REC-002: “This”, “this and future”, and “entire series” edits affect only the promised occurrences; skipped/deleted instances do not reappear.

## Search, notification, files, offline

- QA-PLAT-001: Search returns only current-user records, safe highlights, keyboard navigation and no sensitive query/body logs.
- QA-PLAT-002: Notification unread counts remain consistent after read/clear/open in two tabs; quiet hours/preferences are respected.
- QA-PLAT-003: Private attachment cannot be guessed/cached/publicly fetched; invalid/oversize/infected files are rejected/quarantined safely.
- QA-PLAT-004: Offline allowed create shows Queued, replays once with idempotency after reconnect, and becomes Saved only after acknowledgment.
- QA-PLAT-005: Logout/account switch clears private drafts/queued/cache data for the previous user.

## Analytics and operations

- QA-DATA-001: Chart, accessible table, CSV/PDF, Today metric and API agree for the same filters and timezone.
- QA-DATA-002: Empty and missing data show zero/unknown honestly; no fabricated trends or causal claims.
- QA-OPS-001: Fresh production-like DB migrates forward; failed deploy rollback follows runbook without incompatible schema loss.
- QA-OPS-002: Backup restore meets recorded RPO/RTO and restored data passes ownership/relationship checks.
- QA-OPS-003: Cloudflare cache never serves private/auth/API data between users; origin bypass is blocked.
- QA-OPS-004: Mail/job/storage/database failure emits safe logs/metrics/alerts and retries/degrades according to policy.
