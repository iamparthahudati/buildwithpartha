# EPIC-13 — Search, notifications, recurrence, attachments, and sync

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-1301 | Implement global search backend | User-scoped indexed search across approved entities, grouped result DTO, type filters, safe highlights, ranking, pagination and performance. Queries/bodies are not logged. | LOS-0702, LOS-0802, LOS-1201, LOS-1204, LOS-1102 | M | Backlog |
| LOS-1302 | Build and integrate global search | SearchField/CommandPalette and full results route with keyboard navigation, grouped results, recents, loading/no results/offline, deep links and query privacy. | LOS-0402, LOS-0426, LOS-1301 | M | Backlog |
| LOS-1303 | Model and implement notifications | Notification/preferences schema, list/unread count/read/unread/clear endpoints, source URLs, retention and ownership; security notices are not user-clearable if policy requires. | LOS-0216 | M | Backlog |
| LOS-1304 | Build notification center/settings | Bell/count, grouped list, mark/clear/open, loading/empty/error, quiet hours/category/channel preferences and mobile drawer; counts stay consistent. | LOS-0414, LOS-1303 | M | Backlog |
| LOS-1305 | Implement recurring task model | Series definition/occurrence link, daily/weekly/monthly/weekday/interval/end modes and exception records. Migrations preserve normal tasks. | LOS-0801 | M | Backlog |
| LOS-1306 | Implement recurrence generation/edit API | Idempotent occurrence job and “this/this+future/series” edits, skip/delete/complete behavior, timezone/DST, duplicate prevention and activity. | LOS-1305, LOS-1403 | M | Backlog |
| LOS-1307 | Build recurrence editor and series UX | Human-readable rule builder/summary, end modes, next occurrences, edit-scope dialog, invalid combinations, offline restrictions and accessible controls. | LOS-0434 | M | Backlog |
| LOS-1308 | Integrate recurring tasks | Task form/details/list/calendar use series APIs; generated work appears once; edits/skip/delete and timezone boundary E2E pass. | LOS-1306, LOS-1307 | L | Backlog |
| LOS-1309 | Decide attachment storage and quotas | ADR chooses S3-compatible private store, size/type/count quotas, scanning, retention, signed/download proxy, backup and cost. Feature remains off until accepted. | LOS-0102, LOS-0113 | S | Backlog |
| LOS-1310 | Implement attachment backend | Private upload initiation/finalize/download/delete, metadata, authorization, randomized keys, MIME/content checks, scan/quarantine, quotas, cleanup and audit. | LOS-1309, LOS-1403 | M | Backlog |
| LOS-1311 | Integrate attachments | Connect uploader/list to task/project details, progress/cancel/retry/scan states, unavailable/deleted, private download and responsive/a11y. | LOS-0431, LOS-1310 | M | Backlog |
| LOS-1312 | Implement offline draft storage | User/session-scoped encrypted-where-practical local drafts for notes/brain/forms; clear on logout/account switch; expiry/size handling and explicit labels. | LOS-0508, LOS-1202 | M | Backlog |
| LOS-1313 | Implement offline mutation queue | Stable client IDs/idempotency/dependencies/retry/expiry/status for allowed creates only; unsafe actions disabled. Replay and lost-response cases tested. | LOS-1312, LOS-0802, LOS-1201, LOS-1204 | L | Backlog |
| LOS-1314 | Implement conflict resolution UI | Standard 409/version contract plus compare/copy/reload/restore flows for forms/text and queued mutations; local data never silently lost. | LOS-0414, LOS-1313 | M | Backlog |
| LOS-1315 | Add service-worker shell caching | Cache versioned static app shell only, safe update prompt, no private API response leakage across accounts, clear on logout where needed. Offline claims match reality. | LOS-1312 | M | Backlog |
| LOS-1316 | Run platform feature gate | Search isolation, notification consistency, recurrence DST/idempotency, attachment security if enabled, offline queue/conflict/account switching and a11y pass. | LOS-1301–LOS-1315 | S | Backlog |

