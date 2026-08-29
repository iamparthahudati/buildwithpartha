package tech.buildwithpartha.lifeos.timeblock.api;

import java.time.Instant;
import java.util.UUID;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Response representation of a TimeBlock. */
public record TimeBlockResponse(
    UUID id,
    UUID userId,
    UUID projectId,
    UUID taskId,
    String title,
    String category,
    TimeBlockStatus status,
    Instant startAt,
    Instant endAt,
    String sourceTimeZone,
    String notes,
    long durationMinutes,
    boolean isOvernight,
    boolean spansDstTransition,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public static TimeBlockResponse fromDomain(TimeBlock domain) {
    return new TimeBlockResponse(
        domain.id(),
        domain.userId(),
        domain.projectId().orElse(null),
        domain.taskId().orElse(null),
        domain.title(),
        domain.category(),
        domain.status(),
        domain.startAt(),
        domain.endAt(),
        domain.sourceTimeZone(),
        domain.notes().orElse(null),
        domain.durationMinutes(),
        domain.isOvernight(),
        domain.spansDstTransition(),
        domain.createdAt(),
        domain.updatedAt(),
        domain.version());
  }
}
