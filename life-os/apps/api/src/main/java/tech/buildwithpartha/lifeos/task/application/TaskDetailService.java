package tech.buildwithpartha.lifeos.task.application;

import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.comment.CommentCountPort;
import tech.buildwithpartha.lifeos.common.comment.CommentParentType;
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
  private final CommentCountPort commentCountPort;
  private final ProductActivityPort activityPort;

  public TaskDetailService(
      TaskRepository taskRepository,
      TaskDetailQueryRepository taskDetailQueryRepository,
      CommentCountPort commentCountPort,
      ProductActivityPort activityPort) {
    this.taskRepository = taskRepository;
    this.taskDetailQueryRepository = taskDetailQueryRepository;
    this.commentCountPort = commentCountPort;
    this.activityPort = activityPort;
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

    long commentCount = commentCountPort.count(userId, CommentParentType.TASK, taskId);
    long activityCount = activityPort.countBySubject(userId, ActivitySubjectType.TASK, taskId);
    // Time Block, Focus Session and Attachment stores remain owned by later providers.
    TaskDetailCounts counts = new TaskDetailCounts(0, 0, commentCount, 0, activityCount);
    return new TaskDetailResult(task, dependencies, counts);
  }
}
