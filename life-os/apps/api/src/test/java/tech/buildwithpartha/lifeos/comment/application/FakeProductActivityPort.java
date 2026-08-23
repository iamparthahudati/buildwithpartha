package tech.buildwithpartha.lifeos.comment.application;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord;
import tech.buildwithpartha.lifeos.common.pagination.PageResponse;

final class FakeProductActivityPort implements ProductActivityPort {

  final List<ProductActivityCommand> commands = new ArrayList<>();

  @Override
  public ProductActivityRecord record(ProductActivityCommand command) {
    commands.add(command);
    return new ProductActivityRecord(
        UUID.randomUUID(),
        command.userId(),
        command.actorUserId(),
        command.eventType(),
        command.subjectType(),
        command.subjectId(),
        "comment-test",
        Instant.parse("2026-08-23T10:00:00Z"));
  }

  @Override
  public PageResponse<ProductActivityRecord> findBySubject(
      UUID userId, ActivitySubjectType subjectType, UUID subjectId, int page, int size) {
    return PageResponse.of(List.of(), page, size, 0);
  }

  @Override
  public long countBySubject(UUID userId, ActivitySubjectType subjectType, UUID subjectId) {
    return commands.stream()
        .filter(command -> command.userId().equals(userId))
        .filter(command -> command.subjectType() == subjectType)
        .filter(command -> command.subjectId().equals(subjectId))
        .count();
  }
}
