package tech.buildwithpartha.lifeos.task.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectAccess;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;

/** Owner-scoped current Task link projection for Activity reads. */
@Component
class TaskActivityObjectAccess implements ActivityObjectAccess {

  private final TaskRepository repository;

  TaskActivityObjectAccess(TaskRepository repository) {
    this.repository = repository;
  }

  @Override
  public ActivitySubjectType objectType() {
    return ActivitySubjectType.TASK;
  }

  @Override
  public boolean existsForUser(UUID userId, UUID objectId) {
    return repository.findByIdAndUserId(objectId, userId).isPresent();
  }

  @Override
  public Optional<ActivityObjectReference> findAvailable(UUID userId, UUID objectId) {
    return repository
        .findByIdAndUserId(objectId, userId)
        .filter(task -> !task.isDeleted())
        .map(
            task ->
                new ActivityObjectReference(
                    ActivitySubjectType.TASK,
                    task.id(),
                    task.title(),
                    "/life-os/app/tasks/" + task.id()));
  }
}
