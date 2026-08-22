package tech.buildwithpartha.lifeos.label.infrastructure;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;
import tech.buildwithpartha.lifeos.label.domain.Label;
import tech.buildwithpartha.lifeos.label.domain.LabelRepository;

/** Adapter implementing {@link LabelRepository} using Spring Data JPA. */
@Repository
public class JpaLabelRepository implements LabelRepository {

  private final LabelJpaRepository jpaRepository;
  private final EntityManager entityManager;

  public JpaLabelRepository(LabelJpaRepository jpaRepository) {
    this(jpaRepository, null);
  }

  @org.springframework.beans.factory.annotation.Autowired
  public JpaLabelRepository(
      LabelJpaRepository jpaRepository,
      @org.springframework.beans.factory.annotation.Autowired(required = false)
          EntityManager entityManager) {
    this.jpaRepository = jpaRepository;
    this.entityManager = entityManager;
  }

  @Override
  public Optional<Label> findById(UUID id) {
    return jpaRepository.findById(id).map(JpaLabelRepository::toDomain);
  }

  @Override
  public List<Label> findByUserId(UUID userId) {
    return jpaRepository.findByUserId(userId).stream().map(JpaLabelRepository::toDomain).toList();
  }

  @Override
  public Optional<Label> findByUserIdAndNameNormalized(UUID userId, String nameNormalized) {
    return jpaRepository
        .findByUserIdAndNameNormalized(userId, nameNormalized)
        .map(JpaLabelRepository::toDomain);
  }

  @Override
  public Label save(Label label) {
    LabelEntity entity = toEntity(label);
    LabelEntity saved = jpaRepository.save(entity);
    return toDomain(saved);
  }

  @Override
  public void delete(Label label) {
    jpaRepository.delete(toEntity(label));
  }

  @Override
  public void deleteWithReplacement(UUID userId, UUID labelId, UUID replacementLabelId) {
    if (entityManager != null) {
      entityManager.flush();
    }
    jpaRepository.deleteDuplicateProjectLabels(labelId, replacementLabelId);
    jpaRepository.reassignProjectLabels(userId, labelId, replacementLabelId);
    jpaRepository.deleteDuplicateTaskLabels(labelId, replacementLabelId);
    jpaRepository.reassignTaskLabels(userId, labelId, replacementLabelId);
    jpaRepository.deleteById(labelId);
    if (entityManager != null) {
      entityManager.flush();
      entityManager.clear();
    }
  }

  static Label toDomain(LabelEntity entity) {
    return new Label(
        entity.getId(),
        entity.getUserId(),
        entity.getName(),
        entity.getNameNormalized(),
        entity.getColor(),
        entity.getCreatedAt(),
        entity.getUpdatedAt(),
        entity.getVersion());
  }

  static LabelEntity toEntity(Label domain) {
    return new LabelEntity(
        domain.id(),
        domain.userId(),
        domain.name(),
        domain.nameNormalized(),
        domain.color(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
