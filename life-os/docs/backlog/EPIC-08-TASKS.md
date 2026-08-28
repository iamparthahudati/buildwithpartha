# EPIC-08 — Tasks and task details

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0801 | Model tasks and subtasks | Tables/constraints/indexes for task/subtask, status, priority, MIT local date, estimates/progress/version/soft delete. Projectless tasks supported; ownership enforced. | LOS-0216, LOS-0501 | M | Done |
| LOS-0802 | Implement task CRUD API | Create/read/update/status/complete/cancel/archive/restore/delete/duplicate with validation, concurrency, audit, idempotency and cross-user tests. | LOS-0801 | M | Done |
| LOS-0803 | Implement task list query API | Search/filter project/status/priority/label/date/overdue/MIT, stable sort/pagination/summary counts. Overdue derived from user timezone. | LOS-0802 | M | Done |
| LOS-0804 | Implement subtask API | Ordered create/edit/toggle/delete with transactional task progress policy and concurrency. Partial checklist counts are consistent. | LOS-0802 | M | Done |
| LOS-0805 | Implement MIT API | Atomically set/clear one MIT per user/local date; completing/deleting clears it. Concurrent and timezone-change behavior tested. | LOS-0802 | S | Done |
| LOS-0806 | Model and implement labels | Per-user unique normalized labels, accessible color, CRUD, attach/detach across approved entity types, rename/delete-replace. No cross-user IDs accepted. | LOS-0801 | M | Done |
| LOS-0807 | Model and implement dependencies | Directed task edges; prevent self/cycle/cross-user; list blockers/dependents; transactional changes and derived blocked information. | LOS-0802 | M | Done |
| LOS-0808 | Implement bulk task actions | Validated selection limits; status/priority/project/label/schedule/archive actions; per-item authorization; partial result contract and idempotent retry. | LOS-0802, LOS-0806 | M | Done |
| LOS-0809 | Build TaskRow and TaskCard | Selection/title/project/priority/status/due/progress/comments/MIT/actions; overdue/blocked/done/archived/loading and responsive semantics. | LOS-0434 | M | Done |
| LOS-0810 | Build TaskForm | Title/project/description/status/priority/due/estimate/progress/labels/MIT and advanced fields; validation, dirty/conflict, Quick Add mode. | LOS-0425, LOS-0806 | M | Done |
| LOS-0811 | Build task summary metrics/filter presets | All/To Do/In Progress/Done/Blocked/Overdue counts with actions; URL-compatible presets and accessible values. | LOS-0419, LOS-0420 | S | Done |
| LOS-0812 | Compose Tasks screen with mocks | Header/add, metrics, tabs/filters/sort/search, DataTable/cards, bulk actions, pagination/detail selection and all UX states. | LOS-0809–LOS-0811, LOS-0424 | L | Done |
| LOS-0813 | Integrate Tasks screen | Wire list/summary CRUD/status/MIT/bulk, URL state, safe optimistic updates, partial failures and preserved selection. | LOS-0803, LOS-0805, LOS-0808, LOS-0812 | L | Done |
| LOS-0814 | Build TaskDetailsHeader and metadata | Deep link, title/status/project/priority/due/estimate/spent/progress/labels, action menu and responsive archived/deleted/conflict states. | LOS-0418, LOS-0809 | S | Done |
| LOS-0815 | Build SubtaskChecklist | Add/edit/reorder/toggle/delete, progress display, keyboard controls, pending/partial error and no accidental parent completion. | LOS-0804, LOS-0814 | M | Done |
| LOS-0816 | Build DependencyEditor | Search/select blockers, cycle/error explanations, blocker/dependent lists, completion navigation and mobile dialog behavior. | LOS-0403, LOS-0807 | M | Done |
| LOS-0817 | Build task scheduling and focus panel | Linked time blocks, schedule action, time spent, Start Focus; conflicts/active session handled through shared services. | LOS-0434, LOS-0814 | M | Done |
| LOS-0818 | Compose Task Details with mocks | Details, Subtasks, Dependencies, Comments, Attachments, Activity tabs/sheets with every UX state and list-context return. | LOS-0814–LOS-0817, LOS-0431–LOS-0433 | L | Done |
| LOS-0819 | Implement task detail aggregation API | Task metadata plus subtasks/dependencies/schedule/time/comment/file/activity counts in bounded queries and version contract. | LOS-0802, LOS-0804, LOS-0807 | M | Done |
| LOS-0820 | Integrate Task Details | Connect edit/checklist/dependencies/schedule/focus/comments/files/activity without duplicate domain state; deep link/refresh work. | LOS-0818, LOS-0819 | L | Done |
| LOS-0821 | Implement task comments | Personal task/project comment CRUD with safe Markdown subset/plain text, edit/delete policy, activity and ownership. | LOS-0802, LOS-1404 | M | Done |
| LOS-0822 | Integrate comments | Connect shared composer/list to task/project details with optimistic pending, errors, pagination, edit/delete and sanitization tests. | LOS-0432, LOS-0821 | M | Done |
| LOS-0823 | Implement task activity | Emit/read structured task activity for relevant changes with pagination and deleted-object fallbacks; no sensitive whole-body snapshots. | LOS-0802, LOS-1404 | M | Done |
| LOS-0824 | Integrate task activity | Connect ActivityFeed to task/project detail, filter types, refresh after mutations and accessible timestamps. | LOS-0433, LOS-0823 | M | Done |
| LOS-0825 | Run tasks gate | Lifecycle/list/details/subtasks/labels/dependencies/bulk/comments/activity/MIT/ownership/concurrency/a11y/large-data tests pass. | LOS-0801–LOS-0824 | S | Done |

