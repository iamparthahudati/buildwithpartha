package tech.buildwithpartha.lifeos.task.application;

import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailDependencies;
import tech.buildwithpartha.lifeos.task.domain.TaskDetailQueryRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Loads the user-scoped Task detail read model without per-relationship queries. */
@Service
@Transactional(readOnly = true)
public class TaskDetailService {

  private final TaskRepository taskRepository;
  private final TaskDetailQueryRepository taskDetailQueryRepository;

  public TaskDetailService(
      TaskRepository taskRepository, TaskDetailQueryRepository taskDetailQueryRepository) {
    this.taskRepository = taskRepository;
    this.taskDetailQueryRepository = taskDetailQueryRepository;
  }

  public TaskDetailResult getTaskDetail(UUID userId, UUID taskId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");

    Task task =
        taskRepository
            .findByIdAndUserId(taskId, userId)
            .filter(candidate -> !candidate.isDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Task not found with id: " + taskId));
    TaskDetailDependencies dependencies =
        taskDetailQueryRepository.findDependencies(userId, taskId);

    // These canonical stores are introduced by later tickets. The v1 response keeps their
    // contract stable and truthful until those providers can replace the zero counts.
    return new TaskDetailResult(task, dependencies, TaskDetailCounts.empty());
  }
}
