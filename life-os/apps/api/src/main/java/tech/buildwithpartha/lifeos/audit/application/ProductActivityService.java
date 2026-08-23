package tech.buildwithpartha.lifeos.audit.application;

import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityEvent;
import tech.buildwithpartha.lifeos.audit.domain.ProductActivityRepository;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Transactional implementation of the cross-domain product Activity Event boundary. */
@Service
public class ProductActivityService implements ProductActivityPort {

  public static final int MAX_PAGE_SIZE = 100;

  private final ProductActivityRepository repository;
  private final Clock clock;

  public ProductActivityService(ProductActivityRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Override
  @Transactional
  public ProductActivityRecord record(ProductActivityCommand command) {
    Objects.requireNonNull(command, "command must not be null");
    ProductActivityEvent event =
        new ProductActivityEvent(
            UUID.randomUUID(),
            command.userId(),
            command.actorUserId(),
            command.eventType(),
            command.subjectType(),
            command.subjectId(),
            EventCorrelationIds.current(),
            clock.instant());
    return repository.save(event).toRecord();
  }

  @Override
  @Transactional(readOnly = true)
  public PageResponse<ProductActivityRecord> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    validateQuery(userId, subjectType, subjectId, page, size);
    List<ProductActivityRecord> items =
        repository.findBySubject(userId, subjectType, subjectId, page, size).stream()
            .map(ProductActivityEvent::toRecord)
            .toList();
    long total = repository.countBySubject(userId, subjectType, subjectId);
    return PageResponse.of(items, page, size, total);
  }

  @Override
  @Transactional(readOnly = true)
  public long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId) {
    validateSubject(userId, subjectType, subjectId);
    return repository.countBySubject(userId, subjectType, subjectId);
  }

  private static void validateQuery(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    validateSubject(userId, subjectType, subjectId);
    if (page < 0) {
      throw new IllegalArgumentException("page must be zero or greater");
    }
    if (size < 1 || size > MAX_PAGE_SIZE) {
      throw new IllegalArgumentException("size must be between 1 and " + MAX_PAGE_SIZE);
    }
  }

  private static void validateSubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(subjectType, "subjectType must not be null");
    Objects.requireNonNull(subjectId, "subjectId must not be null");
  }
}
