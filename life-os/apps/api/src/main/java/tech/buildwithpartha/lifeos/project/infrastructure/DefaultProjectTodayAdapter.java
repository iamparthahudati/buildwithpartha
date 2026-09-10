package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.project.ProjectTodayPort;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

/**
 * Project domain adapter implementing {@link ProjectTodayPort} for Today dashboard queries
 * (LOS-1415).
 */
@Component
public class DefaultProjectTodayAdapter implements ProjectTodayPort {

  private final ProjectJpaRepository projectJpaRepository;

  public DefaultProjectTodayAdapter(ProjectJpaRepository projectJpaRepository) {
    this.projectJpaRepository =
        Objects.requireNonNull(projectJpaRepository, "projectJpaRepository must not be null");
  }

  @Override
  @Transactional(readOnly = true)
  public List<TodayProjectSummary> getActiveProjects(UUID userId, int limit) {
    Objects.requireNonNull(userId, "userId must not be null");

    Comparator<ProjectEntity> comparator =
        Comparator.comparing(ProjectEntity::getPriority)
            .thenComparing(
                ProjectEntity::getDeadlineDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(Comparator.comparing(ProjectEntity::getCreatedAt).reversed())
            .thenComparing(ProjectEntity::getId);

    return projectJpaRepository.findByUserId(userId).stream()
        .filter(p -> p.getArchivedAt() == null)
        .filter(p -> p.getStatus() == ProjectStatus.ACTIVE)
        .sorted(comparator)
        .limit(limit > 0 ? limit : 5)
        .map(DefaultProjectTodayAdapter::toSummary)
        .toList();
  }

  @Override
  @Transactional(readOnly = true)
  public Map<UUID, TodayProjectSummary> getProjectSummaries(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");

    return projectJpaRepository.findByUserId(userId).stream()
        .map(DefaultProjectTodayAdapter::toSummary)
        .collect(Collectors.toMap(TodayProjectSummary::id, Function.identity(), (a, b) -> a));
  }

  private static TodayProjectSummary toSummary(ProjectEntity entity) {
    return new TodayProjectSummary(
        entity.getId(), entity.getName(), entity.getColor(), entity.getStatus().name());
  }
}
