package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectAccess;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Owner-scoped current Project link projection for Activity reads. */
@Component
class ProjectActivityObjectAccess implements ActivityObjectAccess {

  private final ProjectRepository repository;

  ProjectActivityObjectAccess(ProjectRepository repository) {
    this.repository = repository;
  }

  @Override
  public ActivitySubjectType objectType() {
    return ActivitySubjectType.PROJECT;
  }

  @Override
  public boolean existsForUser(UUID userId, UUID objectId) {
    return repository
        .findById(objectId)
        .filter(project -> project.userId().equals(userId))
        .isPresent();
  }

  @Override
  public Optional<ActivityObjectReference> findAvailable(UUID userId, UUID objectId) {
    return repository
        .findById(objectId)
        .filter(project -> project.userId().equals(userId))
        .map(
            project ->
                new ActivityObjectReference(
                    ActivitySubjectType.PROJECT,
                    project.id(),
                    project.name(),
                    "/life-os/app/projects/" + project.id()));
  }
}
