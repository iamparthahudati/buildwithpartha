package tech.buildwithpartha.lifeos.task.application;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.task.domain.Task;

/** Executes one bulk item in an isolated transaction so partial success is durable. */
@Service
public class BulkTaskItemExecutor {

  private final TaskService taskService;

  public BulkTaskItemExecutor(TaskService taskService) {
    this.taskService = taskService;
  }

  @Transactional(propagation = Propagation.REQUIRES_NEW)
  public Task execute(UUID userId, UUID taskId, BulkTaskActionCommand command) {
    return taskService.applyBulkAction(userId, taskId, command);
  }
}
