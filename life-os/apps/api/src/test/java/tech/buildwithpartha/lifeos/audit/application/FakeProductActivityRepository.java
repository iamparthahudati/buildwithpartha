package tech.buildwithpartha.lifeos.audit.application;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;

final class FakeProductActivityRepository implements ProductActivityRepository {

  private final List<ProductActivityEvent> events = new ArrayList<>();

  @Override
  public ProductActivityEvent save(ProductActivityEvent event) {
    events.add(event);
    return event;
  }

  @Override
  public List<ProductActivityEvent> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    return events.stream()
        .filter(event -> event.userId().equals(userId))
        .filter(event -> event.subjectType() == subjectType)
        .filter(event -> event.subjectId().equals(subjectId))
        .sorted(
            Comparator.comparing(ProductActivityEvent::occurredAt)
                .thenComparing(ProductActivityEvent::id)
                .reversed())
        .skip((long) page * size)
        .limit(size)
        .toList();
  }

  @Override
  public long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId) {
    return events.stream()
        .filter(event -> event.userId().equals(userId))
        .filter(event -> event.subjectType() == subjectType)
        .filter(event -> event.subjectId().equals(subjectId))
        .count();
  }
}
