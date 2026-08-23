# EPIC-09 — Time blocks, calendar, and focus

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0901 | Model time blocks | Schema for block/category/status/link/start/end/source timezone/version with indexes and constraints. DST/overnight/ownership policies are encoded/tested where possible. | LOS-0216, LOS-0801 | M | Done |
| LOS-0902 | Implement time-block CRUD/conflict API | Day/week queries and create/update/resize/move/complete/delete/duplicate with overlap detection, explicit override, versioning, audit and cross-user tests. | LOS-0901 | M | Backlog |
| LOS-0903 | Build TimeBlockRow | Category color/icon, title/link, local times/duration/status/conflict/current/actions with mobile and accessibility states. | LOS-0434 | S | In Review |
| LOS-0904 | Build TimeBlockForm | Title/category/task/project/date/start/end/timezone/repeat note with DST/overlap validation, conflict resolution and edit/create modes. | LOS-0405, LOS-0425 | M | Backlog |
| LOS-0905 | Build day timeline grid | Time scale, blocks, now line, gaps, keyboard create/move alternative, drag/resize enhancement, collision, zoom/density and small-screen list fallback. | LOS-0903, LOS-0904 | M | Backlog |
| LOS-0906 | Build time summary components | Focus/break/personal/unscheduled metrics, accessible donut/text summary, goal progress, upcoming blocks and quick actions. | LOS-0419, LOS-0429 | S | Backlog |
| LOS-0907 | Compose Time Blocks screen with mocks | Day/week switch, date nav, focus toggle, timeline, summaries, goals/upcoming/actions and all states including DST/conflict/offline. | LOS-0905, LOS-0906 | L | Backlog |
| LOS-0908 | Integrate Time Blocks screen | Wire query/CRUD/drag-resize/duplicate/complete/conflict/version; invalidate Today/calendar precisely and test touch/keyboard alternatives. | LOS-0902, LOS-0907 | L | Backlog |
| LOS-0909 | Implement Calendar aggregation API | Merge blocks, due dates, milestones, habit/review events for range/filter with stable source IDs, ownership, timezone and bounded result policy. | LOS-0902, LOS-0704, LOS-0803 | M | Backlog |
| LOS-0910 | Build calendar primitives | Day/week/month grids, header/date nav, all-day lane, event chips, overflow list, filter legend, keyboard/touch navigation and list alternative. | LOS-0434 | M | Backlog |
| LOS-0911 | Compose and integrate Calendar | Mock all states then connect aggregate API; source click opens true record, filters/URL persist, dense days/DST/month boundaries pass. | LOS-0909, LOS-0910 | L | Backlog |
| LOS-0912 | Model focus sessions | Schema/state machine for planned/actual duration, attached task/block, start/pause/resume/complete/cancel, breaks, interruptions and version. Only one active session per user. | LOS-0801, LOS-0901 | M | Backlog |
| LOS-0913 | Implement focus session API | State transitions are idempotent/concurrent-safe, server-time authoritative, recoverable on refresh, update task time/block state as defined, and cross-user safe. | LOS-0912 | M | Backlog |
| LOS-0914 | Build Focus Mode surface | TimerRing, task/block context, start/pause/resume/complete/cancel/skip break, settings, distraction note, browser notification consent and reduced-motion/a11y. | LOS-0427, LOS-0817 | M | Backlog |
| LOS-0915 | Integrate focus mini-player and full mode | Restore active session after refresh/tab, calculate elapsed correctly after sleep/background, sync transitions, handle offline/server conflict and avoid duplicate completion. | LOS-0605, LOS-0913, LOS-0914 | M | Backlog |
| LOS-0916 | Add focus preferences | API/settings for focus/break/long-break cycles, auto-start choices and sound/browser notification preferences with safe defaults. | LOS-0515, LOS-0913 | S | Backlog |
| LOS-0917 | Implement time goal and planned-vs-actual | Daily focus target and aggregation with timezone/date handling, Today/time-block/report contracts and zero-data behavior. | LOS-0913 | S | Backlog |
| LOS-0918 | Run scheduling/focus gate | Schedule task, detect/override conflict, focus through refresh, complete, calendar/Today/report updates; DST, two tabs, ownership, a11y/responsive tests pass. | LOS-0901–LOS-0917 | S | Backlog |

