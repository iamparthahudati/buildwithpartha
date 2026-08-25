# EPIC-11 — Goals, progress, reports, and analytics

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-1101 | Model goals and check-ins | Goal/check-in/link schema for percentage/numeric/milestone/binary progress, target/date/status/cadence/version. Ownership and calculation invariants tested. | LOS-0216, LOS-0801 | M | Done |
| LOS-1102 | Implement goals API | CRUD/pause/complete/archive/restore/check-in/link endpoints with validation, version, activity, pagination and cross-user tests. | LOS-1101 | M | Backlog |
| LOS-1103 | Build goal components | GoalCard/Row, ProgressEditor, CheckIn form/history, linked work, metric/empty/error states with explicit progress-calculation explanation. | LOS-0434 | M | Backlog |
| LOS-1104 | Compose and integrate Goals screens | List/detail with filters, create/edit/check-in/pause/complete, charts/history, responsive/a11y and conflict behavior. | LOS-1102, LOS-1103 | L | Backlog |
| LOS-1105 | Define analytics metric dictionary | Name formula, source, grain, timezone, exclusions, rounding, freshness and zero-data interpretation for every dashboard/report metric. Version changes are documented. | LOS-0705, LOS-0917, LOS-1010 | S | Backlog |
| LOS-1106 | Implement progress aggregation API | Date/project/label/category queries for task completion, focus planned/actual, project/goal/habit/review progress with bounded SQL and accessible summary text. | LOS-1105 | M | Backlog |
| LOS-1107 | Build Progress screen components | Period controls, summary cards, trends, breakdowns, comparison text, data-table alternatives, empty/partial/error and no unsupported causal claims. | LOS-0429 | M | Backlog |
| LOS-1108 | Compose and integrate Progress screen | URL filters, API queries, responsive chart/list layouts, export entry, caching/freshness and large-range performance. | LOS-1106, LOS-1107 | L | Backlog |
| LOS-1109 | Implement reports API | Named report definitions, validated filters, summary/tables/chart series, asynchronous threshold and ownership. Same metric dictionary drives UI/export. | LOS-1106 | M | Backlog |
| LOS-1110 | Build Reports screen | Report selector, filters, summary/chart/table, saved recent settings if approved, loading/empty/error/large range and mobile print-friendly behavior. | LOS-1109, LOS-0429 | M | Backlog |
| LOS-1111 | Implement CSV export | Background/synchronous threshold, RFC-compatible encoding, formula-injection protection, timezone/metadata header, private short-lived download and audit. | LOS-1109, LOS-1403 | S | Backlog |
| LOS-1112 | Implement PDF report export | Server/client approach ADR, accessible/print-tested layout, page breaks, privacy, private expiry, failure/notification. Only ships after visual QA. | LOS-1111 | M | Backlog |
| LOS-1113 | Run goals/analytics gate | Goal lifecycle and all metric formulas reconcile against fixtures; charts equal tables/exports; timezone, empty, performance, privacy and accessibility pass. | LOS-1101–LOS-1112 | S | Backlog |

