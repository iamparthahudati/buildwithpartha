package tech.buildwithpartha.lifeos.timeblock.domain;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.zone.ZoneRules;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/** Immutable domain aggregate representing a Time Block with invariants and policies. */
public record TimeBlock(
    UUID id,
    UUID userId,
    Optional<UUID> projectId,
    Optional<UUID> taskId,
    String title,
    String category,
    TimeBlockStatus status,
    Instant startAt,
    Instant endAt,
    String sourceTimeZone,
    Optional<String> notes,
    Instant createdAt,
    Instant updatedAt,
    long version) {

  public TimeBlock {
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(projectId, "projectId must not be null");
    Objects.requireNonNull(taskId, "taskId must not be null");
    Objects.requireNonNull(title, "title must not be null");
    Objects.requireNonNull(category, "category must not be null");
    Objects.requireNonNull(status, "status must not be null");
    Objects.requireNonNull(startAt, "startAt must not be null");
    Objects.requireNonNull(endAt, "endAt must not be null");
    Objects.requireNonNull(sourceTimeZone, "sourceTimeZone must not be null");
    Objects.requireNonNull(notes, "notes must not be null");
    Objects.requireNonNull(createdAt, "createdAt must not be null");
    Objects.requireNonNull(updatedAt, "updatedAt must not be null");

    if (title.isBlank()) {
      throw new IllegalArgumentException("TimeBlock title must not be blank");
    }
    if (category.isBlank()) {
      throw new IllegalArgumentException("TimeBlock category must not be blank");
    }
    if (!endAt.isAfter(startAt)) {
      throw new IllegalArgumentException("TimeBlock endAt must be strictly after startAt");
    }
    try {
      ZoneId.of(sourceTimeZone);
    } catch (Exception e) {
      throw new IllegalArgumentException("Invalid sourceTimeZone: " + sourceTimeZone, e);
    }
  }

  /** Calculates the exact duration of the time block in minutes. */
  public long durationMinutes() {
    return Duration.between(startAt, endAt).toMinutes();
  }

  /** Returns whether the time block spans across local midnight in its source timezone. */
  public boolean isOvernight() {
    return isOvernight(ZoneId.of(sourceTimeZone));
  }

  /** Returns whether the time block spans across local midnight in the specified timezone. */
  public boolean isOvernight(ZoneId zoneId) {
    Objects.requireNonNull(zoneId, "zoneId must not be null");
    LocalDate startDate = startAt.atZone(zoneId).toLocalDate();
    LocalDate endDate = endAt.atZone(zoneId).toLocalDate();
    return !startDate.equals(endDate);
  }

  /**
   * Returns whether a Daylight Saving Time (DST) transition occurs between startAt and endAt in the
   * source timezone.
   */
  public boolean spansDstTransition() {
    ZoneId zone = ZoneId.of(sourceTimeZone);
    ZoneRules rules = zone.getRules();
    return !rules.getOffset(startAt).equals(rules.getOffset(endAt));
  }

  /** Returns true if this time block overlaps with another time block. */
  public boolean overlaps(TimeBlock other) {
    Objects.requireNonNull(other, "other time block must not be null");
    return this.startAt.isBefore(other.endAt()) && other.startAt().isBefore(this.endAt);
  }

  /** Returns true if this time block overlaps with the given time range. */
  public boolean overlaps(Instant rangeStart, Instant rangeEnd) {
    Objects.requireNonNull(rangeStart, "rangeStart must not be null");
    Objects.requireNonNull(rangeEnd, "rangeEnd must not be null");
    if (!rangeEnd.isAfter(rangeStart)) {
      throw new IllegalArgumentException("rangeEnd must be strictly after rangeStart");
    }
    return this.startAt.isBefore(rangeEnd) && rangeStart.isBefore(this.endAt);
  }

  /** Checks if this time block is owned by the specified user. */
  public boolean isOwnedBy(UUID checkUserId) {
    return Objects.equals(this.userId, checkUserId);
  }
}
