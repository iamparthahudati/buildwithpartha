# 45 — Database Query Tuning and Indexes Specification

This document defines the database performance optimization standards, index catalog, HikariCP connection pool parameters, statement timeout rules, N+1 query elimination patterns, and query performance regression thresholds for the LifeOS PostgreSQL database.

---

## 1. Overview and Architecture

The LifeOS database tier is powered by PostgreSQL 18 with Flyway schema migrations, Spring Data JPA repositories, and HikariCP connection pooling. High application throughput and low p95 latency depend on:
1. **Measured Indexing**: Creating target composite indexes for primary list, search, report, and dashboard queries without bloating write overhead.
2. **N+1 Query Elimination**: Batch-loading entity associations (Subtasks, Sprint Tasks/Events, Weekly Plan Items/Outcomes/Capacities, Review Answers/Decisions) into in-memory lookup maps in 1+1 queries instead of N queries per row.
3. **Database Aggregation**: Performing count/summary operations directly in PostgreSQL via native SQL `COUNT(CASE WHEN ...)` aggregations instead of loading full entity streams into Java memory.
4. **Bounded Connection & Query Timeouts**: Enforcing explicit HikariCP pool boundaries (`maximum-pool-size: 10`, `connection-timeout: 10000ms`, `leak-detection-threshold: 5000ms`) and JPA query execution ceilings (`jakarta.persistence.query.timeout: 5000ms`).
5. **Performance Regression Thresholds**: Monitoring query execution durations with `DatabaseQueryPerformanceMonitor` (500ms warning threshold) and recording `lifeos.db.query.duration` Micrometer metrics.

---

## 2. HikariCP Connection Pool & Timeout Configurations

The production HikariCP connection pool and JPA timeout configuration are managed in `application.yml`:

```yaml
spring:
  datasource:
    hikari:
      pool-name: LifeOsPool
      maximum-pool-size: 10
      minimum-idle: 2
      idle-timeout: 30000          # 30 seconds
      connection-timeout: 10000    # 10 seconds
      max-lifetime: 1800000        # 30 minutes
      leak-detection-threshold: 5000 # 5 seconds
  jpa:
    open-in-view: false
    properties:
      jakarta.persistence.query.timeout: 5000 # 5 seconds query timeout ceiling
```

### Operational Guardrails
- **Max Pool Size (10)**: Prevents connection starvation on VPS co-located deployments with Caddy and Web containers.
- **Leak Detection Threshold (5s)**: Emits a log warning if a thread holds a database connection longer than 5 seconds without releasing it.
- **Statement Timeout (5s)**: Automatically cancels long-running or un-indexed queries at the database boundary to protect thread pool availability.

---

## 3. Measured Index Catalog (`V34__tune_queries_and_indexes.sql`)

| Table Name | Index Name | Index Columns | Targeted Query Patterns & Dashboards/Lists/Reports |
| --- | --- | --- | --- |
| `tasks` | `ix_tasks_user_project_status` | `(user_id, project_id, status)` | Filtered project task lists & task status filters |
| `tasks` | `ix_tasks_user_updated` | `(user_id, updated_at DESC)` | Default task list pagination & recency ordering |
| `tasks` | `ix_tasks_user_archived` | `(user_id, archived_at)` | Task archiving & active task queries |
| `projects` | `ix_projects_user_updated` | `(user_id, updated_at DESC)` | Project list default sorting & recency pagination |
| `projects` | `ix_projects_user_archived` | `(user_id, archived_at)` | Active vs archived project filters |
| `notes` | `ix_notes_user_updated` | `(user_id, updated_at DESC)` | Notes list recency pagination |
| `notes` | `ix_notes_user_pinned_updated` | `(user_id, pinned DESC, updated_at DESC)` | Default Notes screen list view |
| `notes` | `ix_notes_user_archived` | `(user_id, archived_at)` | Notes active/archived state queries |
| `brain_dump_items` | `ix_brain_dump_items_user_status` | `(user_id, status, created_at DESC)` | Brain Dump inbox & status tab filtering |
| `habit_entries` | `ix_habit_entries_user_date` | `(user_id, local_date)` | Today screen habit entry lookup & multi-day habit reports |
| `time_blocks` | `ix_time_blocks_user_status_start` | `(user_id, status, start_at)` | Time Block calendar range queries & non-cancelled focus time aggregation |
| `focus_sessions` | `ix_focus_sessions_user_status` | `(user_id, status)` | Active focus session lookup & state recovery |
| `focus_sessions` | `ix_focus_sessions_user_start` | `(user_id, start_at DESC)` | Focus session recency history & reports |
| `product_activity_events` | `ix_audit_events_user_timestamp` | `(user_id, timestamp DESC)` | User activity history feed |
| `security_audit_events` | `ix_security_events_user_timestamp` | `(user_id, timestamp DESC)` | Security audit log inspection |
| `sprints` | `ix_sprints_user_status` | `(user_id, status)` | Active sprint lookup & sprint lifecycle queries |
| `comments` | `ix_comments_entity` | `(entity_type, entity_id, created_at ASC)` | Entity comment thread ordering |

---

## 4. N+1 Query Elimination & SQL Aggregations

### 4.1 Association Batch Loading Pattern
Instead of querying child collections per entity row in a loop (which incurs $1 + N$ roundtrips), repositories execute batch lookups by ID collection (`findByXIn(...)`) and map associations in Java memory:

```java
// Example: JpaTaskRepository
private List<Task> loadTasksWithSubtasksBatch(List<TaskEntity> entities) {
  if (entities.isEmpty()) return List.of();
  List<UUID> taskIds = entities.stream().map(TaskEntity::getId).toList();
  Map<UUID, List<Subtask>> subtaskMap =
      subtaskJpaRepository.findByTaskIdInOrderByPositionAsc(taskIds).stream()
          .map(JpaTaskRepository::toSubtaskDomain)
          .collect(Collectors.groupingBy(Subtask::taskId));

  return entities.stream()
      .map(e -> toDomain(e, subtaskMap.getOrDefault(e.getId(), List.of())))
      .toList();
}
```

This pattern is implemented across:
- `JpaTaskRepository`: Batch loads `Subtask` collections.
- `JpaSprintRepository`: Batch loads `SprintTask` and `SprintEvent` collections.
- `JpaWeeklyPlanRepository`: Batch loads `WeeklyPlanCapacity`, `WeeklyPlanOutcome`, and `WeeklyPlanItem` collections.
- `JpaReviewRepository`: Batch loads `ReviewAnswer` and `ReviewItemDecision` collections.

### 4.2 Native Database Aggregation (`COUNT(CASE WHEN ...)`)
Summary counting operations (e.g. `GoalRepository.getSummaryCounts`, `TaskRepository.getSummaryCounts`, `ProjectRepository.getSummaryCounts`) compute metrics in PostgreSQL using single-pass conditional aggregation:

```sql
SELECT
    COUNT(*),
    COUNT(CASE WHEN archived = false AND status NOT IN ('COMPLETED', 'CANCELLED') THEN 1 END),
    COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END),
    COUNT(CASE WHEN status = 'PAUSED' THEN 1 END),
    COUNT(CASE WHEN archived = true THEN 1 END)
FROM public.goals
WHERE user_id = :userId
```

---

## 5. Performance Regression Monitoring & Alert Thresholds

Query latency is monitored by `DatabaseQueryPerformanceMonitor`:
- **Warning Threshold**: Operations taking $\ge 500\text{ ms}$ emit a `WARN` level log statement:
  `"Database query performance regression warning: operation '{}' took {} ms (threshold: 500 ms)"`
- **Micrometer Metric**: Recorded under `lifeos.db.query.duration` tagged with `type` and `slow` (`true`/`false`).

---

## 6. Verification and Regression Testing

- `DatabaseQueryTuningTests` verifies monitor threshold detection, metric emissions, and Flyway migration script index declarations.
- `./gradlew check` ensures full quality gate compliance and spotless/checkstyle formatting.
