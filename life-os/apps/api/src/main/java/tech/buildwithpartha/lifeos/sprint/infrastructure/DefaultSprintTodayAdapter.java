package tech.buildwithpartha.lifeos.sprint.infrastructure;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.sprint.SprintTodayPort;
import tech.buildwithpartha.lifeos.sprint.domain.Sprint;
import tech.buildwithpartha.lifeos.sprint.domain.SprintRepository;
import tech.buildwithpartha.lifeos.sprint.domain.SprintStatus;
import tech.buildwithpartha.lifeos.sprint.domain.SprintTask;

/**
 * Sprint domain adapter implementing {@link SprintTodayPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultSprintTodayAdapter implements SprintTodayPort {

  private final SprintRepository sprintRepository;
  private final EntityManager entityManager;

  public DefaultSprintTodayAdapter(SprintRepository sprintRepository, EntityManager entityManager) {
    this.sprintRepository =
        Objects.requireNonNull(sprintRepository, "sprintRepository must not be null");
    this.entityManager = Objects.requireNonNull(entityManager, "entityManager must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public Optional<TodaySprintSummary> getActiveSprint(UUID userId, LocalDate localDate) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(localDate, "localDate must not be null");

    return sprintRepository.findByUserId(userId).stream()
        .filter(s -> s.status() == SprintStatus.ACTIVE)
        .filter(s -> !localDate.isBefore(s.startDate()) && !localDate.isAfter(s.endDate()))
        .findFirst()
        .or(
            () ->
                sprintRepository.findByUserId(userId).stream()
                    .filter(s -> s.status() == SprintStatus.ACTIVE)
                    .findFirst())
        .map(this::toSummary);
  }

  private TodaySprintSummary toSummary(Sprint sprint) {
    int totalStoryPoints =
        sprint.tasks().stream()
            .filter(t -> t.removedAt().isEmpty())
            .mapToInt(SprintTask::storyPoints)
            .sum();

    String sql =
        """
        SELECT COALESCE(SUM(st.story_points), 0)
        FROM sprint_tasks st
        JOIN tasks t ON st.task_id = t.id
        WHERE st.sprint_id = :sprintId
          AND st.removed_at IS NULL
          AND t.status = 'DONE'
          AND t.deleted_at IS NULL
        """;

    Query query = entityManager.createNativeQuery(sql);
    query.setParameter("sprintId", sprint.id());
    Number completedPoints = (Number) query.getSingleResult();
    int completedStoryPoints = completedPoints != null ? completedPoints.intValue() : 0;

    return new TodaySprintSummary(
        sprint.id(),
        sprint.name(),
        completedStoryPoints,
        totalStoryPoints,
        sprint.startDate(),
        sprint.endDate());
  }
}
