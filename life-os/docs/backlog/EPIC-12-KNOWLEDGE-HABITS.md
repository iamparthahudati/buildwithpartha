# EPIC-12 — Notes, brain dump, and habits

| ID | Ticket | Description and acceptance contract | Depends on |
| --- | --- | --- | --- |
| LOS-1201 | Model and implement notes API | Note schema and CRUD/search/pin/archive/restore with plain/Markdown body, labels, optional entity links, version, ownership and no sensitive body logging. | LOS-0216, LOS-0806 |
| LOS-1202 | Build notes list/editor components | NoteCard, filters, title/body editor, autosave status, labels/links, pin/archive/delete, long text, conflict/offline drafts and mobile layout. | LOS-0434 |
| LOS-1203 | Compose and integrate Notes | List/detail deep links, search/filter, autosave debounce/cancel/version, safe Markdown rendering, stale/conflict recovery, responsive/a11y. | LOS-1201, LOS-1202 |
| LOS-1204 | Model and implement brain dump API | Fast create/list/process/archive/delete/convert with source trace and idempotent transactional conversion to task/note/project idea/goal. | LOS-0802, LOS-1201, LOS-1102 |
| LOS-1205 | Build brain-dump capture and inbox | Fast text capture, queued/offline label, keyboard shortcut, item list, batch selection, convert/defer/archive/delete and clear empty/errors. | LOS-0434 |
| LOS-1206 | Build conversion workflow | Destination preview/fields, preserve source, transactional result link, retry after timeout without duplicates, partial batch results. | LOS-1204, LOS-1205 |
| LOS-1207 | Compose and integrate Brain Dump | Capture, inbox, filters, batch triage/conversion, responsive/a11y and offline draft/queue integration. | LOS-1204–LOS-1206 |
| LOS-1208 | Model habits and entries | Habit/cadence/reminder/entry schema with local date, target count, pause periods, uniqueness/version and timezone-safe streak invariants. | LOS-0216, LOS-0513 |
| LOS-1209 | Implement habits API | CRUD/pause/archive/restore, today/range entries, increment/set/remove, reminder preferences, stats endpoint and cross-user/idempotency tests. | LOS-1208 |
| LOS-1210 | Define habit/streak calculations | Document cadence eligibility, pause, late edit, timezone change, missed day, count target and rounding. Deterministic fixtures cover boundaries. | LOS-1208 |
| LOS-1211 | Build habit components | HabitRow/Card, entry control, streak/consistency, calendar heatmap with table alternative, form, reminder, pause/archive and all states. | LOS-0429, LOS-0434 |
| LOS-1212 | Compose and integrate Habits | Today/list/detail/history/statistics with optimistic safe entry rollback, URL dates, timezone change and responsive/a11y. | LOS-1209–LOS-1211 |
| LOS-1213 | Add Today capture/habit integration | Quick Add/Today widgets use shared note/brain/habit services, show accurate queued/saved state and precise invalidation. | LOS-0604, LOS-1203, LOS-1207, LOS-1212 |
| LOS-1214 | Run knowledge/habits gate | Notes autosave/conflict, brain conversion idempotency, habit/streak/timezone, ownership, offline labeling, sanitization, a11y and large data pass. | LOS-1201–LOS-1213 |

