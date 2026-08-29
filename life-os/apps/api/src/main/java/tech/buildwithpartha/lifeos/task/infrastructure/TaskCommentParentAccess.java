package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.comment.CommentParentAccess;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Task ownership/lifecycle adapter for the shared Comment domain. */
@Component
class TaskCommentParentAccess implements CommentParentAccess {

  private final TaskRepository taskRepository;

  TaskCommentParentAccess(TaskRepository taskRepository) {
    this.taskRepository = taskRepository;
  }

  @Override
  public CommentParentType parentType() {
    return CommentParentType.TASK;
  }

  @Override
  public void requireReadable(UUID userId, UUID parentId) {
    ownedTask(userId, parentId);
  }

  @Override
  public void requireWritable(UUID userId, UUID parentId) {
    Task task = ownedTask(userId, parentId);
    if (task.isArchived()) {
      throw new FieldValidationException(
          "Task is read-only", List.of(new FieldProblem("taskId", "READ_ONLY")));
    }
  }

  private Task ownedTask(UUID userId, UUID taskId) {
    return taskRepository
        .findByIdAndUserId(taskId, userId)
        .filter(task -> !task.isDeleted())
        .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
  }
}
