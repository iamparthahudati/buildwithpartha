package tech.buildwithpartha.lifeos.common.task;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Domain-neutral Task read port for Today dashboard aggregation (LOS-1415). */
public interface TodayTaskPort {

  Optional<TodayTaskRecord> getMitTask(UUID userId, LocalDate localDate, ZoneId zoneId);

  List<TodayTaskRecord> getTasksDueToday(
      UUID userId, LocalDate localDate, ZoneId zoneId, Instant now, int limit);

  TodayOverdueRecord getOverdueTasks(UUID userId, Instant now, ZoneId zoneId, int limit);

  Map<UUID, ProjectTaskCountRecord> getProjectTaskCounts(UUID userId);

  int getCompletedTasksCountToday(UUID userId, Instant startOfDay, Instant endOfDay);

  record TodayTaskRecord(
      UUID id,
      String title,
      Optional<UUID> projectId,
      String priority,
      Optional<LocalDate> dueDate,
      boolean completed,
      boolean isOverdue) {}

  record TodayOverdueRecord(int totalCount, List<TodayTaskRecord> topOverdueTasks) {}

  record ProjectTaskCountRecord(int completedCount, int totalCount) {}
}
