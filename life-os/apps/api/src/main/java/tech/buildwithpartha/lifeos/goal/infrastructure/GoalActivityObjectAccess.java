package tech.buildwithpartha.lifeos.goal.infrastructure;

import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectAccess;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.goal.domain.GoalRepository;

/** Owner-scoped current Goal link projection for Activity reads. */
@Component
class GoalActivityObjectAccess implements ActivityObjectAccess {

  private final GoalRepository repository;

  GoalActivityObjectAccess(GoalRepository repository) {
    this.repository = repository;
  }

  @Override
  public ActivitySubjectType objectType() {
    return ActivitySubjectType.GOAL;
  }

  @Override
  public boolean existsForUser(UUID userId, UUID objectId) {
    return repository.findById(objectId).filter(goal -> goal.userId().equals(userId)).isPresent();
  }

  @Override
  public Optional<ActivityObjectReference> findAvailable(UUID userId, UUID objectId) {
    return repository
        .findById(objectId)
        .filter(goal -> goal.userId().equals(userId))
        .map(
            goal ->
                new ActivityObjectReference(
                    ActivitySubjectType.GOAL,
                    goal.id(),
                    goal.title(),
                    "/life-os/app/goals/" + goal.id()));
  }
}
