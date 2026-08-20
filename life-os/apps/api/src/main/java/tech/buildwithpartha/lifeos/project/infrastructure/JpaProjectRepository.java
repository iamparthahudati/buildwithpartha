package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectRepository;

/** Adapter implementing {@link ProjectRepository} using Spring Data JPA. */
@Repository
public class JpaProjectRepository implements ProjectRepository {

  private final ProjectJpaRepository jpaRepository;

  public JpaProjectRepository(ProjectJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Optional<Project> findById(UUID id) {
    return jpaRepository.findById(id).map(JpaProjectRepository::toDomain);
  }

  @Override
  public List<Project> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).stream().map(JpaProjectRepository::toDomain).toList();
  }

  @Override
  public Project save(Project project) {
    ProjectEntity entity = toEntity(project);
    ProjectEntity saved = jpaRepository.save(entity);
    return toDomain(saved);
  }

  @Override
  public void delete(Project project) {
    jpaRepository.delete(toEntity(project));
  }

  static Project toDomain(ProjectEntity entity) {
    return new Project(
        entity.getId(),
        entity.getUserId(),
        entity.getName(),
        Optional.ofNullable(entity.getDescription()),
        entity.getStatus(),
        entity.getPriority(),
        entity.getHealth(),
        Optional.ofNullable(entity.getColor()),
        Optional.ofNullable(entity.getIcon()),
        Optional.ofNullable(entity.getStartDate()),
        Optional.ofNullable(entity.getDeadlineDate()),
        Optional.ofNullable(entity.getEstimateMinutes()),
        Optional.ofNullable(entity.getArchivedAt()),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getLabelIds(),
        entity.getVersion());
  }

  static ProjectEntity toEntity(Project domain) {
    return new ProjectEntity(
        domain.id(),
        domain.userId(),
        domain.name(),
        domain.description().orElse(null),
        domain.status(),
        domain.priority(),
        domain.health(),
        domain.color().orElse(null),
        domain.icon().orElse(null),
        domain.startDate().orElse(null),
        domain.deadlineDate().orElse(null),
        domain.estimateMinutes().orElse(null),
        domain.archivedAt().orElse(null),
        domain.createdAt(),
        domain.updatedAt(),
        domain.labelIds(),
        domain.version());
  }
}
