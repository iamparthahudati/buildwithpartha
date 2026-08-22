package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Domain repository interface for Task aggregates. */
public interface TaskRepository {

  Task save(Task task);

  Optional<Task> findById(UUID id);

  Optional<Task> findByIdAndUserId(UUID id, UUID userId);

  List<Task> findByUserId(UUID userId);

  List<Task> findByProjectId(UUID projectId);

  List<Task> findByUserIdAndMitDate(UUID userId, LocalDate mitDate);

  void deleteById(UUID id);

  void clearMitDateForUserAndDate(UUID userId, LocalDate mitDate);

  TaskQueryResult queryTasks(TaskQuery query);

  TaskSummaryCounts getSummaryCounts(UUID userId, Instant now);
}
