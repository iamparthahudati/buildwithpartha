# 46. Cross-User Authorization Matrix and Endpoint Isolation

## Overview

LifeOS enforces strict cross-user data isolation and tenant boundary protection. Every user-owned domain entity, sub-resource, background job, search query, export stream, and mutation endpoint is scoped to the authenticated user principal (`@AuthenticationPrincipal UUID userId`). 

Cross-user access, parameter tampering, and Insecure Direct Object References (IDOR) are prevented through deep domain repository query scoping and strict foreign reference validation.

---

## Core Security Invariants

1. **Row-Level User Scoping**:
   All database queries for user-owned entities include `userId = :userId` in their WHERE clause, preventing access across tenant boundaries at the SQL/persistence tier.

2. **Indistinguishability Guarantee**:
   Attempts by User B to read, modify, or delete a resource owned by User A return `404 RESOURCE_NOT_FOUND` (or an empty collection for list endpoints), identical to querying a non-existent UUID. This prevents entity existence enumeration and timing side-channels.

3. **Cross-User Reference Rejection**:
   When creating or mutating a resource, any foreign references (e.g., assigning a Project ID or Label ID to a Task, or setting a Blocker Task) are validated to ensure they belong to the current authenticated user. Referencing another user's resource results in a `400 BAD_REQUEST` field validation failure.

4. **Search and Aggregate Isolation**:
   Global search (`/search`), calendar queries (`/calendar/events`), daily/weekly reports (`/reports/**`), and active focus session recovery (`/focus-sessions/active`) query only the caller's own records.

---

## Endpoint Authorization Matrix

| Resource Domain | Method | Endpoint Path | Authorization & Scoping Mechanism | Foreign ID Access Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Auth & Security** | `GET` | `/auth/session` | Resolves current session from `lifeos_session` cookie | Returns only active user session |
| | `GET` | `/auth/security/sessions` | `sessionRepository.findByUserId(userId)` | Returns only authenticated user's sessions |
| | `DELETE` | `/auth/security/sessions/{id}` | `sessionRepository.revokeSession(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| **User Profile** | `GET` | `/user/profile` | Resolves profile for `@AuthenticationPrincipal UUID userId` | Returns caller's profile only |
| | `PUT` | `/user/profile` | Updates profile for `@AuthenticationPrincipal UUID userId` | Affects caller only |
| | `GET` | `/user/preferences` | `preferencesRepository.findByUserId(userId)` | Returns caller's preferences only |
| | `PUT` | `/user/preferences` | `preferencesRepository.save(userId, ...)` | Affects caller only |
| **Projects** | `GET` | `/projects` | `projectRepository.findByUserId(userId, ...)` | Returns only caller's projects |
| | `POST` | `/projects` | Creates project bound to caller's `userId` | Created under caller's tenant |
| | `GET` | `/projects/{id}` | `projectRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/projects/{id}/detail` | `projectService.getProjectDetail(userId, id)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/projects/{id}` | `projectRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/projects/{id}/archive` | `projectService.archive(userId, id, version)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/projects/{id}/restore` | `projectService.restore(userId, id, version)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/projects/{id}/duplicate` | `projectService.duplicate(userId, id, name)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/projects/{id}` | `projectService.delete(userId, id)` | `404 RESOURCE_NOT_FOUND` |
| **Project Milestones** | `GET` | `/projects/{pId}/milestones` | Scoped by project ownership validation | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/projects/{pId}/milestones` | Verifies project ownership before milestone creation | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/projects/{pId}/milestones/{mId}` | `milestoneRepository.findByIdAndProjectIdAndUserId` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/projects/{pId}/milestones/{mId}/status` | `milestoneRepository.findByIdAndProjectIdAndUserId` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/projects/{pId}/milestones/{mId}` | `milestoneRepository.deleteByIdAndUserId` | `404 RESOURCE_NOT_FOUND` |
| **Tasks** | `GET` | `/tasks` | `taskRepository.query(userId, ...)` | Returns only caller's tasks |
| | `POST` | `/tasks` | Validates `projectId` and `labelIds` belong to caller | `400 BAD_REQUEST` on foreign reference |
| | `GET` | `/tasks/{id}` | `taskRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/tasks/{id}/detail` | `taskService.getTaskDetail(userId, id)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/tasks/{id}` | `taskRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PATCH` | `/tasks/{id}/status` | `taskService.updateStatus(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/{id}/duplicate` | `taskService.duplicate(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/{id}/archive` | `taskService.archive(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/{id}/restore` | `taskService.restore(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/{id}` | `taskService.delete(userId, id)` | `404 RESOURCE_NOT_FOUND` |
| **Subtasks** | `POST` | `/tasks/{taskId}/subtasks` | Verifies parent task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/tasks/{taskId}/subtasks/{subId}` | Verifies task and subtask ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `PATCH` | `/tasks/{taskId}/subtasks/{subId}/toggle`| Verifies task and subtask ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/{taskId}/subtasks/{subId}` | Verifies task and subtask ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| **Most Important Task (MIT)** | `GET` | `/tasks/mit` | `taskRepository.findMitByUserIdAndDate(userId, date)` | Returns `204 NO_CONTENT` if no caller MIT |
| | `POST` | `/tasks/{id}/mit` | Verifies task ownership before designating MIT | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/{id}/mit` | Verifies task ownership before clearing MIT | `404 RESOURCE_NOT_FOUND` |
| **Task Dependencies** | `GET` | `/tasks/{id}/dependencies` | Verifies task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/{id}/dependencies` | Verifies task and target task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/{id}/dependencies/{depId}` | Verifies dependency ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| **Recurring Task Series** | `GET` | `/tasks/recurring-series` | `recurringRepository.findByUserId(userId)` | Returns only caller's series |
| | `POST` | `/tasks/recurring-series` | Creates series bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/tasks/recurring-series/{id}` | `recurringRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/tasks/recurring-series/{id}` | `recurringRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/recurring-series/{id}/skip` | `recurringRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/tasks/recurring-series/{id}/exceptions`| `recurringRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/recurring-series/{id}` | `recurringRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| **Time Blocks & Calendar** | `GET` | `/time-blocks` | `timeBlockRepository.findByUserIdAndRange(...)` | Returns only caller's time blocks |
| | `POST` | `/time-blocks` | Validates task reference and binds to caller `userId` | `400 BAD_REQUEST` on foreign task |
| | `GET` | `/time-blocks/{id}` | `timeBlockRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PATCH` | `/time-blocks/{id}/move` | `timeBlockRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PATCH` | `/time-blocks/{id}/resize` | `timeBlockRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/time-blocks/{id}/complete` | `timeBlockRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/time-blocks/{id}` | `timeBlockRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/calendar/events` | `calendarService.getEvents(userId, range, tz)` | Returns only caller's scheduled events |
| **Focus Sessions** | `GET` | `/focus-sessions/active` | `focusSessionRepository.findActiveByUserId(userId)` | Returns `204 NO_CONTENT` if caller inactive |
| | `POST` | `/focus-sessions` | Validates task/block context belongs to `userId` | `400 BAD_REQUEST` on foreign context |
| | `GET` | `/focus-sessions/{id}` | `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/pause` | `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/resume` | `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/start-break`| `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/resume-focus`| `focusSessionRepository.findByIdAndUserId(id, userId)`| `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/complete`| `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/cancel` | `focusSessionRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/focus-sessions/{id}/interruptions`| `focusSessionRepository.findByIdAndUserId(id, userId)`| `404 RESOURCE_NOT_FOUND` |
| **Goals & Check-ins** | `GET` | `/goals` | `goalRepository.query(userId, ...)` | Returns only caller's goals |
| | `POST` | `/goals` | Creates goal bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/goals/{id}` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/goals/{id}/detail` | `goalService.getGoalDetail(userId, id)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/goals/{id}` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/pause` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/complete` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/archive` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/restore` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/goals/{id}` | `goalRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/check-ins` | Verifies goal ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/goals/{id}/check-ins` | Verifies goal ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/goals/{id}/check-ins/{cId}` | Verifies goal and check-in ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/goals/{id}/links` | Verifies goal and target entity ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/goals/{id}/links` | Verifies goal ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/goals/{id}/links/{lId}` | Verifies link and goal ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| **Habits & Entries** | `GET` | `/habits` | `habitRepository.findByUserId(userId, ...)` | Returns only caller's habits |
| | `POST` | `/habits` | Creates habit bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/habits/{id}` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/habits/{id}` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/habits/{id}/entries/increment`| `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/habits/{id}/entries` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/habits/{id}/entries` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/habits/{id}/pauses` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/habits/{id}/stats` | `habitService.statistics(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/habits/{id}` | `habitRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| **Notes & Brain Dump** | `GET` | `/notes` | `noteRepository.query(userId, ...)` | Returns only caller's notes |
| | `POST` | `/notes` | Validates label/link ownership and binds `userId` | `400 BAD_REQUEST` on foreign reference |
| | `GET` | `/notes/{id}` | `noteRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/notes/{id}` | `noteRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/notes/{id}/pin` | `noteRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/notes/{id}/unpin` | `noteRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/notes/{id}` | `noteRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/brain-dump-items` | `brainDumpRepository.findByUserId(userId)` | Returns only caller's items |
| | `POST` | `/brain-dump-items` | Creates item bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/brain-dump-items/{id}` | `brainDumpRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/brain-dump-items/{id}/convert/task`| `brainDumpService.convertToTask(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/brain-dump-items/{id}`| `brainDumpRepository.findByIdAndUserId(id, userId)`| `404 RESOURCE_NOT_FOUND` |
| **Sprints, Plans & Reviews** | `GET` | `/sprints` | `sprintRepository.findByUserId(userId)` | Returns only caller's sprints |
| | `POST` | `/sprints` | Creates sprint bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/sprints/{id}` | `sprintRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/sprints/{id}/start` | `sprintService.startSprint(userId, id, ...)` | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/reviews/draft` | Creates review bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/reviews/{id}` | `reviewRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| **Labels & Comments** | `GET` | `/labels` | `labelRepository.findByUserId(userId)` | Returns only caller's labels |
| | `POST` | `/labels` | Creates label bound to caller `userId` | Created under caller's tenant |
| | `GET` | `/labels/{id}` | `labelRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `PUT` | `/labels/{id}` | `labelRepository.findByIdAndUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/labels/{id}` | `labelRepository.findByUserId(id, userId)` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/tasks/{tId}/comments` | Verifies task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `POST` | `/tasks/{tId}/comments` | Verifies task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/tasks/{tId}/comments/{cId}`| Verifies task and comment ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `DELETE` | `/tasks/{tId}/comments/{cId}`| Verifies task and comment ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/tasks/{tId}/activity` | Verifies task ownership (`userId`) | `404 RESOURCE_NOT_FOUND` |
| **Search, Reports & Exports** | `GET` | `/search?q={query}` | Search index filter restricted to `userId` | Returns empty results for foreign terms |
| | `GET` | `/reports/export/csv/{token}` | Validates export token belongs to caller `userId` | `404 RESOURCE_NOT_FOUND` |
| | `GET` | `/auth/export/status` | Queries export job status for caller `userId` | Caller status only |
| | `GET` | `/notifications` | `notificationRepository.findByUserId(userId)` | Returns only caller's notifications |
| | `GET` | `/notifications/unread-count`| `notificationRepository.countUnreadByUserId(userId)`| Caller count only |
| | `PUT` | `/notifications/{id}/read`| `notificationRepository.markRead(id, userId)` | `404 RESOURCE_NOT_FOUND` |

---

## Verification Test Suite

The cross-user authorization guarantees and IDOR prevention matrix are authoritatively tested via:

- **Integration Test Suite**: `tech.buildwithpartha.lifeos.auth.api.CrossUserAuthorizationMatrixIntegrationTests`
- **Execution Command**: `./gradlew test --tests "tech.buildwithpartha.lifeos.auth.api.CrossUserAuthorizationMatrixIntegrationTests"`
- **Test Matrix Scope**:
  - `testUserProfileAndPreferencesIsolation`
  - `testSessionRevocationIsolation`
  - `testProjectIsolation`
  - `testMilestoneIsolation`
  - `testTaskIsolation`
  - `testCrossUserTaskLinkingRejected`
  - `testSubtaskIsolation`
  - `testMitIsolation`
  - `testTaskDependenciesIsolation`
  - `testRecurringTasksIsolation`
  - `testTimeBlockIsolation`
  - `testCalendarEventsIsolation`
  - `testFocusSessionIsolation`
  - `testGoalsIsolation`
  - `testHabitIsolation`
  - `testNotesAndBrainDumpIsolation`
  - `testSprintsPlansAndReviewsIsolation`
  - `testLabelsCommentsAndActivityIsolation`
  - `testSearchIsolation`
  - `testExportIsolation`
  - `testNotificationIsolation`
