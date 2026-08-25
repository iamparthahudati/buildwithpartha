# EPIC-10 — Sprints, week planning, and reviews

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-1001 | Model and implement sprints API | Sprint, committed tasks, capacity, goal/status/scope events/retrospective with CRUD/start/complete/carry-over. Date/overlap/ownership/concurrency rules tested. | LOS-0802, LOS-0917 | M | Done |
| LOS-1002 | Build sprint components | SprintCard, progress/capacity, task commitment list, scope-change history, form, completion/retrospective dialog and empty/error states. | LOS-0434 | M | Done |
| LOS-1003 | Compose and integrate Sprints screen | Active/upcoming/completed views, plan/start/change scope/complete/carry-over, URL state and responsive/a11y; metrics remain consistent with task status. | LOS-1001, LOS-1002 | L | Done |
| LOS-1004 | Model and implement Weekly Plan API | Week/capacity/outcomes/items/review status with draft/finalize/update, task/day allocation, conflict summary and historical snapshot. Respect week start/timezone. | LOS-0803, LOS-0902 | M | Backlog |
| LOS-1005 | Build week strip and capacity components | Seven-day strip, planned/available minutes, task counts, completion, conflict/overcapacity and accessible non-drag controls. | LOS-0429, LOS-0903 | S | Done |
| LOS-1006 | Build weekly outcomes and backlog planner | Select/create outcomes, unscheduled task queue, filters, allocate/move/carry, partial errors and keyboard/mobile equivalents to drag. | LOS-0424, LOS-1005 | M | Backlog |
| LOS-1007 | Compose Week Planner with mocks | Week nav, capacity, outcomes, schedule, backlog, conflicts, finalize/reopen and all state matrices at responsive sizes. | LOS-1005, LOS-1006 | L | Backlog |
| LOS-1008 | Integrate Week Planner | Connect weekly plan/task/block APIs with idempotent moves, conflicts, versioning, Today/calendar invalidation and large-list performance. | LOS-1004, LOS-1007 | L | Backlog |
| LOS-1009 | Model review records and snapshots | Daily/weekly/monthly review schema, answers, draft/final state, snapshot metrics, local period keys/version. Missing data and repeated finalize handled. | LOS-0216, LOS-0108 | M | Backlog |
| LOS-1010 | Implement review APIs | Get prompts/metrics, save draft, finalize, reopen policy, list history. Snapshot is transactional, user-scoped, timezone-correct and stable after source changes. | LOS-1009 | M | Backlog |
| LOS-1011 | Build Daily Review flow | Morning/evening steps for MIT/schedule/priorities and wins/carry-over/learning/tomorrow, draft/resume/skip/final states, 5–10 minute accessible flow. | LOS-0434, LOS-0609 | S | Backlog |
| LOS-1012 | Build Weekly Review flow | Summary, inbox cleanup, project/goal/habit review, reflection, next outcomes/capacity; draft/resume/final and missing-data honesty. | LOS-0434, LOS-1007 | M | Backlog |
| LOS-1013 | Build Monthly Review flow | Outcome/time/project/goal/habit summary plus highlights/challenges/stop-start-continue/themes; month/timezone boundaries and incomplete weeks. | LOS-0429, LOS-0434 | M | Backlog |
| LOS-1014 | Integrate review flows and dashboard prompts | Connect review APIs, source navigation, carry-over actions and Today review status without double applying mutations. | LOS-1010–LOS-1013, LOS-0613 | M | Backlog |
| LOS-1015 | Run planning/review gate | Sprint and week lifecycle plus daily/weekly/monthly draft/final/history; rollover, snapshots, timezone, concurrency, accessibility and responsive tests pass. | LOS-1001–LOS-1014 | S | Backlog |
