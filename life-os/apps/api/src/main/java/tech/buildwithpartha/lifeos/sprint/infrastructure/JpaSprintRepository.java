package tech.buildwithpartha.lifeos.sprint.infrastructure;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintEvent;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

@Repository
public class JpaSprintRepository implements SprintRepository {
  private final SprintJpaRepository sprints;
  private final SprintTaskJpaRepository tasks;
  private final SprintEventJpaRepository events;

  public JpaSprintRepository(
      SprintJpaRepository sprints, SprintTaskJpaRepository tasks, SprintEventJpaRepository events) {
    this.sprints = sprints;
    this.tasks = tasks;
    this.events = events;
  }

  @Override
  public void lockUser(UUID userId) {
    if (sprints.lockUserById(userId) == null) {
      throw new ResourceNotFoundException("Account not found");
    }
  }

  @Override
  public Sprint save(Sprint sprint) {
    SprintEntity saved = sprints.saveAndFlush(toEntity(sprint));
    tasks.saveAllAndFlush(
        sprint.tasks().stream().map(task -> toEntity(sprint.id(), task)).toList());
    events.saveAllAndFlush(
        sprint.events().stream().map(event -> toEntity(sprint.id(), event)).toList());
    return load(saved);
  }

  @Override
  public Optional<Sprint> findByIdAndUserId(UUID id, UUID userId) {
    return sprints.findByIdAndUserId(id, userId).map(this::load);
  }

  @Override
  public List<Sprint> findByUserId(UUID userId) {
    return sprints.findByUserIdOrderByStartDateAsc(userId).stream().map(this::load).toList();
  }

  @Override
  public boolean hasOverlap(UUID userId, LocalDate startDate, LocalDate endDate, UUID excludeId) {
    return sprints.hasOverlap(userId, startDate, endDate, excludeId);
  }

  @Override
  public void delete(Sprint sprint) {
    sprints.deleteById(sprint.id());
  }

  private Sprint load(SprintEntity entity) {
    List<SprintTask> sprintTasks =
        tasks.findBySprintIdOrderByPositionAscIdAsc(entity.getId()).stream()
            .map(
                task ->
                    new SprintTask(
                        task.getId(),
                        task.getTaskId(),
                        task.getStoryPoints(),
                        task.getPosition(),
                        task.isAddedAfterStart(),
                        task.getCommittedAt(),
                        Optional.ofNullable(task.getRemovedAt()),
                        Optional.ofNullable(task.getCarriedOverToSprintId())))
            .toList();
    List<SprintEvent> sprintEvents =
        events.findBySprintIdOrderByOccurredAtAscIdAsc(entity.getId()).stream()
            .map(
                event ->
                    new SprintEvent(
                        event.getId(),
                        event.getEventType(),
                        Optional.ofNullable(event.getTaskId()),
                        Optional.ofNullable(event.getPointsDelta()),
                        Optional.ofNullable(event.getReason()),
                        event.getOccurredAt()))
            .toList();
    return new Sprint(
        entity.getId(),
        entity.getUserId(),
        entity.getName(),
        Optional.ofNullable(entity.getGoal()),
        entity.getStartDate(),
        entity.getEndDate(),
        entity.getStatus(),
        entity.getTargetCapacityPoints(),
        Optional.ofNullable(entity.getRetrospectiveNotes()),
        Optional.ofNullable(entity.getWhatWentWell()),
        Optional.ofNullable(entity.getWhatCouldBeImproved()),
        entity.getActionItems(),
        entity.getCommittedTaskCount(),
        entity.getCompletedTaskCount(),
        entity.getAddedTaskCount(),
        entity.getRemovedTaskCount(),
        entity.getCarriedOverTaskCount(),
        entity.getTotalStoryPoints(),
        entity.getCompletedStoryPoints(),
        Optional.ofNullable(entity.getCompletedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        sprintTasks,
        sprintEvents,
        entity.getVersion());
  }

  private static SprintEntity toEntity(Sprint sprint) {
    return new SprintEntity(
        sprint.id(),
        sprint.userId(),
        sprint.name(),
        sprint.goal().orElse(null),
        sprint.startDate(),
        sprint.endDate(),
        sprint.status(),
        sprint.targetCapacityPoints(),
        sprint.retrospectiveNotes().orElse(null),
        sprint.whatWentWell().orElse(null),
        sprint.whatCouldBeImproved().orElse(null),
        sprint.actionItems(),
        sprint.committedTaskCount(),
        sprint.completedTaskCount(),
        sprint.addedTaskCount(),
        sprint.removedTaskCount(),
        sprint.carriedOverTaskCount(),
        sprint.totalStoryPoints(),
        sprint.completedStoryPoints(),
        sprint.completedAt().orElse(null),
        sprint.createdAt(),
        sprint.updatedAt(),
        sprint.version());
  }

  private static SprintTaskEntity toEntity(UUID sprintId, SprintTask task) {
    return new SprintTaskEntity(
        task.id(),
        sprintId,
        task.taskId(),
        task.storyPoints(),
        task.position(),
        task.addedAfterStart(),
        task.committedAt(),
        task.removedAt().orElse(null),
        task.carriedOverToSprintId().orElse(null));
  }

  private static SprintEventEntity toEntity(UUID sprintId, SprintEvent event) {
    return new SprintEventEntity(
        event.id(),
        sprintId,
        event.eventType(),
        event.taskId().orElse(null),
        event.pointsDelta().orElse(null),
        event.reason().orElse(null),
        event.occurredAt());
  }
}
