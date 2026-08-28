package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.progress.TaskProgressPort;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

/** Task-owned implementation of TaskProgressPort (LOS-1106). */
@Service
public class DefaultTaskProgressAdapter implements TaskProgressPort {

  private final TaskRepository taskRepository;

  public DefaultTaskProgressAdapter(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  @Override
  public TaskProgressData getTaskProgress(
      UUID userId,
      Instant rangeStart,
      Instant rangeEnd,
      Instant now,
      UUID projectId,
      UUID labelId) {

    List<Task> userTasks = taskRepository.findByUserId(userId);

    List<Task> filteredTasks =
        userTasks.stream()
            .filter(t -> !t.isDeleted())
            .filter(t -> projectId == null || t.projectId().map(projectId::equals).orElse(false))
            .filter(t -> labelId == null || t.labelIds().contains(labelId))
            .toList();

    int totalCount = filteredTasks.size();

    int completedCount =
        (int)
            filteredTasks.stream()
                .filter(t -> t.status() == TaskStatus.DONE)
                .filter(
                    t -> {
                      Instant updated = t.updatedAt();
                      return !updated.isBefore(rangeStart) && updated.isBefore(rangeEnd);
                    })
                .count();

    int dueCount =
        (int)
            filteredTasks.stream()
                .filter(
                    t ->
                        t.dueAt()
                            .map(due -> !due.isBefore(rangeStart) && due.isBefore(rangeEnd))
                            .orElse(false))
                .count();

    int overdueCount = (int) filteredTasks.stream().filter(t -> t.isOverdue(now)).count();

    int highPriorityCount =
        (int)
            filteredTasks.stream()
                .filter(t -> t.status() != TaskStatus.DONE)
                .filter(t -> t.priority() == TaskPriority.P1)
                .count();

    int blockedCount =
        (int) filteredTasks.stream().filter(t -> t.status() == TaskStatus.BLOCKED).count();

    return new TaskProgressData(
        totalCount, completedCount, dueCount, overdueCount, highPriorityCount, blockedCount);
  }
}
