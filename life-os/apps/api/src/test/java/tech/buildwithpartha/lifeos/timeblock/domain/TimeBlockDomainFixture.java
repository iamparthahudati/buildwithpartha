package tech.buildwithpartha.lifeos.timeblock.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Test fixture builder for {@link TimeBlock} instances. */
public final class TimeBlockDomainFixture {

  private UUID id = UUID.randomUUID();
  private UUID userId = UUID.randomUUID();
  private Optional<UUID> projectId = Optional.empty();
  private Optional<UUID> taskId = Optional.empty();
  private String title = "Deep Work Block";
  private String category = "FOCUS";
  private TimeBlockStatus status = TimeBlockStatus.SCHEDULED;
  private Instant startAt = Instant.parse("2026-08-24T09:00:00Z");
  private Instant endAt = Instant.parse("2026-08-24T10:30:00Z");
  private String sourceTimeZone = "America/New_York";
  private Optional<String> notes = Optional.empty();
  private Instant createdAt = Instant.parse("2026-08-24T08:00:00Z");
  private Instant updatedAt = Instant.parse("2026-08-24T08:00:00Z");
  private long version = 0L;

  private TimeBlockDomainFixture() {}

  public static TimeBlockDomainFixture aTimeBlock() {
    return new TimeBlockDomainFixture();
  }

  public TimeBlockDomainFixture withId(UUID id) {
    this.id = id;
    return this;
  }

  public TimeBlockDomainFixture withUserId(UUID userId) {
    this.userId = userId;
    return this;
  }

  public TimeBlockDomainFixture withProjectId(UUID projectId) {
    this.projectId = Optional.ofNullable(projectId);
    return this;
  }

  public TimeBlockDomainFixture withTaskId(UUID taskId) {
    this.taskId = Optional.ofNullable(taskId);
    return this;
  }

  public TimeBlockDomainFixture withTitle(String title) {
    this.title = title;
    return this;
  }

  public TimeBlockDomainFixture withCategory(String category) {
    this.category = category;
    return this;
  }

  public TimeBlockDomainFixture withStatus(TimeBlockStatus status) {
    this.status = status;
    return this;
  }

  public TimeBlockDomainFixture withStartAt(Instant startAt) {
    this.startAt = startAt;
    return this;
  }

  public TimeBlockDomainFixture withEndAt(Instant endAt) {
    this.endAt = endAt;
    return this;
  }

  public TimeBlockDomainFixture withSourceTimeZone(String sourceTimeZone) {
    this.sourceTimeZone = sourceTimeZone;
    return this;
  }

  public TimeBlockDomainFixture withNotes(String notes) {
    this.notes = Optional.ofNullable(notes);
    return this;
  }

  public TimeBlockDomainFixture withVersion(long version) {
    this.version = version;
    return this;
  }

  public TimeBlock build() {
    return new TimeBlock(
        id,
        userId,
        projectId,
        taskId,
        title,
        category,
        status,
        startAt,
        endAt,
        sourceTimeZone,
        notes,
        createdAt,
        updatedAt,
        version);
  }
}
