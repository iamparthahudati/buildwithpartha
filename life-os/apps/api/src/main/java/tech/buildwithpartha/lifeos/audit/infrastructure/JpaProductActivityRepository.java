package tech.buildwithpartha.lifeos.audit.infrastructure;

import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

@Component
class JpaProductActivityRepository implements ProductActivityRepository {

  private final ProductActivityEventJpaRepository jpa;

  JpaProductActivityRepository(ProductActivityEventJpaRepository jpa) {
    this.jpa = jpa;
  }

  @Override
  public ProductActivityEvent save(ProductActivityEvent event) {
    return toDomain(jpa.save(toEntity(event)));
  }

  @Override
  public List<ProductActivityEvent> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    return jpa.findByUserIdAndSubjectTypeAndSubjectIdOrderByOccurredAtDescIdDesc(
            userId, subjectType, subjectId, PageRequest.of(page, size))
        .map(JpaProductActivityRepository::toDomain)
        .getContent();
  }

  @Override
  public long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId) {
    return jpa.countByUserIdAndSubjectTypeAndSubjectId(userId, subjectType, subjectId);
  }

  private static ProductActivityEventEntity toEntity(ProductActivityEvent event) {
    return new ProductActivityEventEntity(
        event.id(),
        event.userId(),
        event.actorUserId(),
        event.eventType(),
        event.subjectType(),
        event.subjectId(),
        event.correlationId(),
        event.occurredAt());
  }

  private static ProductActivityEvent toDomain(ProductActivityEventEntity entity) {
    return new ProductActivityEvent(
        entity.getId(),
        entity.getUserId(),
        entity.getActorUserId(),
        entity.getEventType(),
        entity.getSubjectType(),
        entity.getSubjectId(),
        entity.getCorrelationId(),
        entity.getOccurredAt());
  }
}
