package tech.buildwithpartha.lifeos.project.infrastructure;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneRepository;

/** Adapter implementing {@link MilestoneRepository} using Spring Data JPA. */
@Repository
public class JpaMilestoneRepository implements MilestoneRepository {

  private final MilestoneJpaRepository jpaRepository;

  public JpaMilestoneRepository(MilestoneJpaRepository jpaRepository) {
    this.jpaRepository = jpaRepository;
  }

  @Override
  public Optional<Milestone> findById(UUID id) {
    return jpaRepository.findById(id).map(JpaMilestoneRepository::toDomain);
  }

  @Override
  public List<Milestone> findByProjectId(UUID projectId) {
    return jpaRepository.findByProjectId(projectId).stream()
        .map(JpaMilestoneRepository::toDomain)
        .toList();
  }

  @Override
  public Milestone save(Milestone milestone) {
    MilestoneEntity entity = toEntity(milestone);
    MilestoneEntity saved = jpaRepository.save(entity);
    return toDomain(saved);
  }

  @Override
  public void delete(Milestone milestone) {
    jpaRepository.delete(toEntity(milestone));
  }

  static Milestone toDomain(MilestoneEntity entity) {
    return new Milestone(
        entity.getId(),
        entity.getProjectId(),
        entity.getTitle(),
        Optional.ofNullable(entity.getDate()),
        entity.getStatus(),
        entity.getOrdering(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  static MilestoneEntity toEntity(Milestone domain) {
    return new MilestoneEntity(
        domain.id(),
        domain.projectId(),
        domain.title(),
        domain.date().orElse(null),
        domain.status(),
        domain.ordering(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
