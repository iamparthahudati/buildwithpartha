package tech.buildwithpartha.lifeos.audit.application;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectAccess;
import tech.buildwithpartha.lifeos.common.activity.ActivityObjectReference;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

/** Resolves bounded Product Activity into current, owner-scoped API projections. */
@Service
public class ActivityReadService {

  public static final int MAX_PAGE_SIZE = 100;

  private final ProductActivityPort activityPort;
  private final Map<ActivitySubjectType, ActivityObjectAccess> objectAccess;

  public ActivityReadService(
      ProductActivityPort activityPort, List<ActivityObjectAccess> objectAccess) {
    this.activityPort = activityPort;
    EnumMap<ActivitySubjectType, ActivityObjectAccess> accessByType =
        new EnumMap<>(ActivitySubjectType.class);
    objectAccess.forEach(
        access -> {
          if (accessByType.put(access.objectType(), access) != null) {
            throw new IllegalStateException("Duplicate Activity object access adapter");
          }
        });
    this.objectAccess = Map.copyOf(accessByType);
  }

  @Transactional(readOnly = true)
  public PageResponse<ActivityReadItem> read(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(subjectType, "subjectType must not be null");
    Objects.requireNonNull(subjectId, "subjectId must not be null");
    validatePage(page, size);

    PageResponse<ProductActivityRecord> records =
        activityPort.findBySubject(userId, subjectType, subjectId, page, size);
    if (!access(subjectType).existsForUser(userId, subjectId) && records.totalItems() == 0) {
      throw new ResourceNotFoundException("Activity subject not found");
    }
    List<ActivityReadItem> items = records.items().stream().map(this::toReadItem).toList();
    return PageResponse.of(items, page, size, records.totalItems());
  }

  private ActivityReadItem toReadItem(ProductActivityRecord record) {
    ActivityObjectReference object =
        access(record.objectType()).findAvailable(record.userId(), record.objectId()).orElse(null);
    return new ActivityReadItem(
        record.id(),
        record.actorUserId(),
        record.eventType(),
        Optional.ofNullable(object),
        record.occurredAt());
  }

  private ActivityObjectAccess access(ActivitySubjectType type) {
    ActivityObjectAccess access = objectAccess.get(type);
    if (access == null) {
      throw new IllegalStateException("No Activity object access adapter for " + type);
    }
    return access;
  }

  private static void validatePage(int page, int size) {
    if (page < 0) {
      throw new FieldValidationException("Invalid page", List.of(new FieldProblem("page", "MIN")));
    }
    if (size < 1 || size > MAX_PAGE_SIZE) {
      throw new FieldValidationException(
          "Invalid size", List.of(new FieldProblem("size", "RANGE")));
    }
  }
}
