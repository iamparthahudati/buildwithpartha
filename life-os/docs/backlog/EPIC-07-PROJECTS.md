# EPIC-07 — Projects and project details

| ID | Ticket | Description and acceptance contract | Depends on | Estimate | Status |
| --- | --- | --- | --- | --- | --- |
| LOS-0701 | Model projects and milestones | Flyway entities/constraints/indexes for project, milestone, label links and versioning. Status/priority/health/deadline invariants and user ownership are tested. | LOS-0216, LOS-0501 | M | Done |
| LOS-0702 | Implement project CRUD API | Create/read/update/archive/restore/delete endpoints with DTO validation, optimistic version, ownership, problem details, audit and OpenAPI. Cross-user tests for every operation. | LOS-0701 | M | Done |
| LOS-0703 | Implement project list query API | Search/filter status/priority/health/label/deadline, stable sort, pagination, summary counts and bounded queries. Empty/large data and invalid filters tested. | LOS-0702 | M | Done |
| LOS-0704 | Implement milestone API | Ordered project-scoped milestone create/update/status/delete with deadline validation, concurrency and activity. Parent access always user-scoped. | LOS-0702 | M | Done |
| LOS-0705 | Define project progress and health calculations | Record count/weight policy, rounding, cancelled/archived behavior and manual vs derived health. Unit tests cover zero tasks and mixed states. | LOS-0701, LOS-0801 | S | Done |
| LOS-0706 | Build ProjectRow and ProjectCard | Name/icon/description/status/progress/task count/deadline/priority/health/update/actions; responsive and loading/archived/overdue states. | LOS-0434 | M | Done |
| LOS-0707 | Build ProjectForm | Name/description/status/priority/health/color/icon/start/deadline/estimate/labels with progressive disclosure, validation, dirty/conflict states. | LOS-0407, LOS-0425 | M | Done |
| LOS-0708 | Build project summary metric strip | Total/active/completed/on-hold/at-risk/progress metrics with filter actions and accessible values. | LOS-0419 | S | Done |
| LOS-0709 | Compose Projects screen with mock states | Header/add, metrics, tabs/filters/sort/view, DataTable/cards, details selection, pagination and all UX states at responsive sizes. | LOS-0706–LOS-0708, LOS-0424 | L | Done |
| LOS-0710 | Integrate Projects screen | Wire list/summary CRUD/archive/restore, URL state, optimistic safe actions/query invalidation and cross-page selection behavior. | LOS-0702, LOS-0703, LOS-0709 | L | Done |
| LOS-0711 | Build ProjectDetailsHeader | Back/deep link, identity, status, owner, priority, dates, estimate, edit/add task/menu with responsive wrapping and archived state. | LOS-0418, LOS-0706 | S | Done |
| LOS-0712 | Build project overview components | Progress/task/time/health cards, breakdown charts, top tasks, description/labels, activity and empty/error states using shared patterns. | LOS-0429, LOS-0433, LOS-0711 | M | Done |
| LOS-0713 | Build ProjectTimeline and milestones | Accessible milestone timeline/list, add/edit/status, overdue/current/future and mobile behavior. | LOS-0430, LOS-0704 | M | Done |
| LOS-0714 | Compose Project Details tabs with mocks | Overview, Tasks, Timeline, Files, Notes, Activity with deep-link tabs and archived/missing/permission/conflict states. | LOS-0711–LOS-0713, LOS-0431–LOS-0433 | L | Done |
| LOS-0715 | Implement project detail aggregation API | Bounded overview counts/breakdowns/top tasks/time/health/milestones/activity plus ETag/version; partial optional sections modeled. | LOS-0702, LOS-0704, LOS-0705 | M | Done |
| LOS-0716 | Integrate Project Details | Connect details/edit/milestones/tabs and later shared task/file/note/activity services without duplicate state. Deep links and refresh work. | LOS-0714, LOS-0715 | L | Done |
| LOS-0717 | Run projects gate | Project lifecycle/list/details/milestones/progress/ownership/concurrency/a11y/responsive/large-data tests pass; no task is silently lost on archive/complete. | LOS-0701–LOS-0716 | S | Done |

