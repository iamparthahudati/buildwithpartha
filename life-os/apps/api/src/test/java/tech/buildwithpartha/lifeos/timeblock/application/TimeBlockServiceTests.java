package tech.buildwithpartha.lifeos.timeblock.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.TimeBlockOverlapConflictException;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

class TimeBlockServiceTests {

  private static final Instant NOW = Instant.parse("2026-08-24T08:00:00Z");
  private static final UUID USER_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

  private InMemoryTimeBlockRepository repository;
  private TimeBlockService service;

  @BeforeEach
  void setUp() {
    repository = new InMemoryTimeBlockRepository();
    Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    service =
        new TimeBlockService(
            repository, Optional.empty(), Optional.empty(), Optional.empty(), clock);
  }

  @Test
  @DisplayName("createTimeBlock saves a new time block when no conflicts exist")
  void createTimeBlockSuccess() {
    CreateTimeBlockCommand command =
        new CreateTimeBlockCommand(
            "Deep Work",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T10:00:00Z"),
            "UTC",
            Optional.of("Focus notes"),
            Optional.empty(),
            Optional.empty(),
            false);

    TimeBlock created = service.createTimeBlock(USER_ID, command);

    assertThat(created.id()).isNotNull();
    assertThat(created.userId()).isEqualTo(USER_ID);
    assertThat(created.title()).isEqualTo("Deep Work");
    assertThat(created.status()).isEqualTo(TimeBlockStatus.SCHEDULED);
    assertThat(created.durationMinutes()).isEqualTo(60);
  }

  @Test
  @DisplayName(
      "createTimeBlock throws conflict exception when overlaps exist and allowOverlap is false")
  void createTimeBlockOverlapConflict() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(existing);

    CreateTimeBlockCommand command =
        new CreateTimeBlockCommand(
            "Overlapping Block",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:30:00Z"),
            Instant.parse("2026-08-24T10:30:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false);

    assertThatThrownBy(() -> service.createTimeBlock(USER_ID, command))
        .isInstanceOf(TimeBlockOverlapConflictException.class)
        .hasMessageContaining("overlaps 1 existing block");
  }

  @Test
  @DisplayName("createTimeBlock permits overlap when allowOverlap is true")
  void createTimeBlockAllowOverlap() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(existing);

    CreateTimeBlockCommand command =
        new CreateTimeBlockCommand(
            "Allowed Overlap",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:30:00Z"),
            Instant.parse("2026-08-24T10:30:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            true);

    TimeBlock created = service.createTimeBlock(USER_ID, command);
    assertThat(created).isNotNull();
    assertThat(created.title()).isEqualTo("Allowed Overlap");
  }

  @Test
  @DisplayName("updateTimeBlock updates attributes successfully when versions match")
  void updateTimeBlockSuccess() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock().withUserId(USER_ID).withVersion(0L).build();
    repository.save(existing);

    UpdateTimeBlockCommand command =
        new UpdateTimeBlockCommand(
            "Updated Title",
            "MEETING",
            TimeBlockStatus.IN_PROGRESS,
            existing.startAt(),
            existing.endAt(),
            "UTC",
            Optional.of("Updated notes"),
            Optional.empty(),
            Optional.empty(),
            0L,
            false);

    TimeBlock updated = service.updateTimeBlock(USER_ID, existing.id(), command);

    assertThat(updated.title()).isEqualTo("Updated Title");
    assertThat(updated.category()).isEqualTo("MEETING");
    assertThat(updated.status()).isEqualTo(TimeBlockStatus.IN_PROGRESS);
  }

  @Test
  @DisplayName("updateTimeBlock throws ConcurrencyConflictException when version mismatches")
  void updateTimeBlockVersionMismatch() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock().withUserId(USER_ID).withVersion(1L).build();
    repository.save(existing);

    UpdateTimeBlockCommand command =
        new UpdateTimeBlockCommand(
            "Stale Update",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            existing.startAt(),
            existing.endAt(),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            0L, // Stale version
            false);

    assertThatThrownBy(() -> service.updateTimeBlock(USER_ID, existing.id(), command))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  @DisplayName("moveTimeBlock shifts start and end times")
  void moveTimeBlockSuccess() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .withVersion(0L)
            .build();
    repository.save(existing);

    MoveTimeBlockCommand command =
        new MoveTimeBlockCommand(
            Instant.parse("2026-08-24T11:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"),
            0L,
            false);

    TimeBlock moved = service.moveTimeBlock(USER_ID, existing.id(), command);
    assertThat(moved.startAt()).isEqualTo(Instant.parse("2026-08-24T11:00:00Z"));
    assertThat(moved.endAt()).isEqualTo(Instant.parse("2026-08-24T12:00:00Z"));
  }

  @Test
  @DisplayName("resizeTimeBlock alters duration")
  void resizeTimeBlockSuccess() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .withVersion(0L)
            .build();
    repository.save(existing);

    ResizeTimeBlockCommand command =
        new ResizeTimeBlockCommand(
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T10:30:00Z"),
            0L,
            false);

    TimeBlock resized = service.resizeTimeBlock(USER_ID, existing.id(), command);
    assertThat(resized.durationMinutes()).isEqualTo(90);
  }

  @Test
  @DisplayName("changeStatus transitions status to COMPLETED")
  void changeStatusSuccess() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStatus(TimeBlockStatus.SCHEDULED)
            .build();
    repository.save(existing);

    ChangeTimeBlockStatusCommand command =
        new ChangeTimeBlockStatusCommand(TimeBlockStatus.COMPLETED, Optional.of(0L));

    TimeBlock completed = service.changeStatus(USER_ID, existing.id(), command);
    assertThat(completed.status()).isEqualTo(TimeBlockStatus.COMPLETED);
  }

  @Test
  @DisplayName("duplicateTimeBlock creates a copy at specified target times")
  void duplicateTimeBlockSuccess() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withTitle("Template Task")
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(existing);

    DuplicateTimeBlockCommand command =
        new DuplicateTimeBlockCommand(
            Optional.of(Instant.parse("2026-08-24T14:00:00Z")),
            Optional.of(Instant.parse("2026-08-24T15:00:00Z")),
            false);

    TimeBlock duplicated = service.duplicateTimeBlock(USER_ID, existing.id(), command);
    assertThat(duplicated.id()).isNotEqualTo(existing.id());
    assertThat(duplicated.title()).isEqualTo("Template Task");
    assertThat(duplicated.startAt()).isEqualTo(Instant.parse("2026-08-24T14:00:00Z"));
  }

  @Test
  @DisplayName("deleteTimeBlock removes time block when owned by user")
  void deleteTimeBlockSuccess() {
    TimeBlock existing = TimeBlockDomainFixture.aTimeBlock().withUserId(USER_ID).build();
    repository.save(existing);

    service.deleteTimeBlock(USER_ID, existing.id());

    assertThatThrownBy(() -> service.getTimeBlock(USER_ID, existing.id()))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("queryTimeBlocks supports date and range queries")
  void queryTimeBlocksByDateAndRange() {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(block);

    TimeBlockQuery dateQuery =
        new TimeBlockQuery(
            USER_ID,
            Optional.empty(),
            Optional.empty(),
            Optional.of(LocalDate.parse("2026-08-24")),
            Optional.of("UTC"),
            Optional.empty(),
            Optional.empty());

    List<TimeBlock> results = service.queryTimeBlocks(dateQuery);
    assertThat(results).hasSize(1);
    assertThat(results.get(0).id()).isEqualTo(block.id());
  }

  @Test
  @DisplayName("checkOverlap detects conflicts accurately")
  void checkOverlapPreflight() {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(block);

    OverlapCheckResult conflictResult =
        service.checkOverlap(
            USER_ID,
            Instant.parse("2026-08-24T09:30:00Z"),
            Instant.parse("2026-08-24T10:30:00Z"),
            Optional.empty());

    assertThat(conflictResult.hasConflict()).isTrue();
    assertThat(conflictResult.conflictingBlocks()).hasSize(1);

    OverlapCheckResult noConflictResult =
        service.checkOverlap(
            USER_ID,
            Instant.parse("2026-08-24T10:00:00Z"),
            Instant.parse("2026-08-24T11:00:00Z"),
            Optional.empty());

    assertThat(noConflictResult.hasConflict()).isFalse();
  }

  @Test
  @DisplayName("queryTimeBlocks supports range, project, task, and default queries")
  void queryTimeBlocksBranches() {
    UUID projectId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withProjectId(projectId)
            .withTaskId(taskId)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(block);

    TimeBlockQuery rangeQuery =
        new TimeBlockQuery(
            USER_ID,
            Optional.of(Instant.parse("2026-08-24T08:00:00Z")),
            Optional.of(Instant.parse("2026-08-24T12:00:00Z")),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty());
    assertThat(service.queryTimeBlocks(rangeQuery)).hasSize(1);

    TimeBlockQuery projectQuery =
        new TimeBlockQuery(
            USER_ID,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.of(projectId),
            Optional.empty());
    assertThat(service.queryTimeBlocks(projectQuery)).hasSize(1);

    TimeBlockQuery taskQuery =
        new TimeBlockQuery(
            USER_ID,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.of(taskId));
    assertThat(service.queryTimeBlocks(taskQuery)).hasSize(1);

    TimeBlockQuery defaultQuery =
        new TimeBlockQuery(
            USER_ID,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty());
    assertThat(service.queryTimeBlocks(defaultQuery)).hasSize(1);
  }

  @Test
  @DisplayName("duplicateTimeBlock handles startAt-only and empty time inputs")
  void duplicateTimeBlockTimingBranches() {
    TimeBlock existing =
        TimeBlockDomainFixture.aTimeBlock()
            .withUserId(USER_ID)
            .withStartAt(Instant.parse("2026-08-24T09:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:00:00Z"))
            .build();
    repository.save(existing);

    DuplicateTimeBlockCommand startOnlyCmd =
        new DuplicateTimeBlockCommand(
            Optional.of(Instant.parse("2026-08-24T11:00:00Z")), Optional.empty(), false);
    TimeBlock dup1 = service.duplicateTimeBlock(USER_ID, existing.id(), startOnlyCmd);
    assertThat(dup1.startAt()).isEqualTo(Instant.parse("2026-08-24T11:00:00Z"));
    assertThat(dup1.endAt()).isEqualTo(Instant.parse("2026-08-24T12:00:00Z"));

    DuplicateTimeBlockCommand emptyCmd =
        new DuplicateTimeBlockCommand(Optional.empty(), Optional.empty(), false);
    TimeBlock dup2 = service.duplicateTimeBlock(USER_ID, existing.id(), emptyCmd);
    assertThat(dup2.startAt()).isEqualTo(Instant.parse("2026-08-24T10:00:00Z"));
    assertThat(dup2.endAt()).isEqualTo(Instant.parse("2026-08-24T11:00:00Z"));
  }

  @Test
  @DisplayName(
      "createTimeBlock and updateTimeBlock invoke validators and activity port when provided")
  void createAndUpdateWithValidatorsAndActivity() {
    UUID projectId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator pVal = (u, p) -> {};
    tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator tVal = (u, t) -> {};

    List<tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand> activityLogs =
        new ArrayList<>();
    tech.buildwithpartha.lifeos.common.activity.ProductActivityPort actPort =
        new tech.buildwithpartha.lifeos.common.activity.ProductActivityPort() {
          @Override
          public tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord record(
              tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand command) {
            activityLogs.add(command);
            return null;
          }

          @Override
          public tech.buildwithpartha.lifeos.common.pagination.PageResponse<
                  tech.buildwithpartha.lifeos.common.activity.ProductActivityRecord>
              findBySubject(
                  UUID userId,
                  tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType subjectType,
                  UUID subjectId,
                  int page,
                  int size) {
            return null;
          }

          @Override
          public long countBySubject(
              UUID userId,
              tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType subjectType,
              UUID subjectId) {
            return 0;
          }
        };

    TimeBlockService serviceWithMocks =
        new TimeBlockService(
            repository,
            Optional.of(pVal),
            Optional.of(tVal),
            Optional.of(actPort),
            Clock.fixed(NOW, ZoneOffset.UTC));

    CreateTimeBlockCommand createCmd =
        new CreateTimeBlockCommand(
            "Linked Block",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T10:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.of(projectId),
            Optional.of(taskId),
            false);

    TimeBlock created = serviceWithMocks.createTimeBlock(USER_ID, createCmd);
    assertThat(created).isNotNull();
    assertThat(activityLogs).hasSize(2);

    UpdateTimeBlockCommand updateCmd =
        new UpdateTimeBlockCommand(
            "Updated Linked Block",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            created.startAt(),
            created.endAt(),
            "UTC",
            Optional.empty(),
            Optional.of(projectId),
            Optional.of(taskId),
            created.version(),
            false);

    TimeBlock updated = serviceWithMocks.updateTimeBlock(USER_ID, created.id(), updateCmd);
    assertThat(updated.title()).isEqualTo("Updated Linked Block");
  }

  @Test
  @DisplayName(
      "checkOverlap throws IllegalArgumentException when endAt is not strictly after startAt")
  void checkOverlapInvalidRange() {
    assertThatThrownBy(
            () ->
                service.checkOverlap(
                    USER_ID,
                    Instant.parse("2026-08-24T10:00:00Z"),
                    Instant.parse("2026-08-24T09:00:00Z"),
                    Optional.empty()))
        .isInstanceOf(IllegalArgumentException.class);
  }

  @Test
  @DisplayName("changeStatus throws ConcurrencyConflictException when version mismatches")
  void changeStatusVersionMismatch() {
    TimeBlock block =
        TimeBlockDomainFixture.aTimeBlock().withUserId(USER_ID).withVersion(0L).build();
    repository.save(block);

    ChangeTimeBlockStatusCommand cmd =
        new ChangeTimeBlockStatusCommand(TimeBlockStatus.COMPLETED, Optional.of(1L));
    assertThatThrownBy(() -> service.changeStatus(USER_ID, block.id(), cmd))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  @DisplayName("duplicateTimeBlock with both startAt and endAt present")
  void duplicateTimeBlockBothTimes() {
    TimeBlock existing = TimeBlockDomainFixture.aTimeBlock().withUserId(USER_ID).build();
    repository.save(existing);

    DuplicateTimeBlockCommand cmd =
        new DuplicateTimeBlockCommand(
            Optional.of(Instant.parse("2026-08-24T14:00:00Z")),
            Optional.of(Instant.parse("2026-08-24T16:00:00Z")),
            false);

    TimeBlock dup = service.duplicateTimeBlock(USER_ID, existing.id(), cmd);
    assertThat(dup.startAt()).isEqualTo(Instant.parse("2026-08-24T14:00:00Z"));
    assertThat(dup.endAt()).isEqualTo(Instant.parse("2026-08-24T16:00:00Z"));
  }

  @Test
  @DisplayName("Command constructors handle null Optional parameters gracefully")
  void commandNullFallbackConstructorTests() {
    CreateTimeBlockCommand cCmd =
        new CreateTimeBlockCommand(
            "Title",
            "CAT",
            TimeBlockStatus.SCHEDULED,
            NOW,
            NOW.plusSeconds(3600),
            "UTC",
            null,
            null,
            null,
            false);
    assertThat(cCmd.notes()).isEmpty();
    assertThat(cCmd.projectId()).isEmpty();
    assertThat(cCmd.taskId()).isEmpty();

    UpdateTimeBlockCommand uCmd =
        new UpdateTimeBlockCommand(
            "Title",
            "CAT",
            TimeBlockStatus.SCHEDULED,
            NOW,
            NOW.plusSeconds(3600),
            "UTC",
            null,
            null,
            null,
            0L,
            false);
    assertThat(uCmd.notes()).isEmpty();

    DuplicateTimeBlockCommand dCmd = new DuplicateTimeBlockCommand(null, null, false);
    assertThat(dCmd.startAt()).isEmpty();

    ChangeTimeBlockStatusCommand sCmd =
        new ChangeTimeBlockStatusCommand(TimeBlockStatus.COMPLETED, null);
    assertThat(sCmd.version()).isEmpty();

    TimeBlockQuery qCmd = new TimeBlockQuery(USER_ID, null, null, null, null, null, null);
    assertThat(qCmd.rangeStart()).isEmpty();
  }

  private static class InMemoryTimeBlockRepository implements TimeBlockRepository {
    private final List<TimeBlock> blocks = new ArrayList<>();

    @Override
    public TimeBlock save(TimeBlock timeBlock) {
      blocks.removeIf(b -> b.id().equals(timeBlock.id()));
      blocks.add(timeBlock);
      return timeBlock;
    }

    @Override
    public Optional<TimeBlock> findById(UUID id) {
      return blocks.stream().filter(b -> b.id().equals(id)).findFirst();
    }

    @Override
    public Optional<TimeBlock> findByIdAndUserId(UUID id, UUID userId) {
      return blocks.stream()
          .filter(b -> b.id().equals(id) && b.userId().equals(userId))
          .findFirst();
    }

    @Override
    public List<TimeBlock> findByUserId(UUID userId) {
      return blocks.stream().filter(b -> b.userId().equals(userId)).toList();
    }

    @Override
    public List<TimeBlock> findByUserIdAndRange(UUID userId, Instant rangeStart, Instant rangeEnd) {
      return blocks.stream()
          .filter(b -> b.userId().equals(userId) && b.overlaps(rangeStart, rangeEnd))
          .toList();
    }

    @Override
    public List<TimeBlock> findByProjectId(UUID projectId) {
      return blocks.stream()
          .filter(b -> b.projectId().isPresent() && b.projectId().get().equals(projectId))
          .toList();
    }

    @Override
    public List<TimeBlock> findByTaskId(UUID taskId) {
      return blocks.stream()
          .filter(b -> b.taskId().isPresent() && b.taskId().get().equals(taskId))
          .toList();
    }

    @Override
    public List<TimeBlock> findByUserIdAndProjectId(UUID userId, UUID projectId) {
      return blocks.stream()
          .filter(
              b ->
                  b.userId().equals(userId)
                      && b.projectId().isPresent()
                      && b.projectId().get().equals(projectId))
          .toList();
    }

    @Override
    public List<TimeBlock> findByUserIdAndTaskId(UUID userId, UUID taskId) {
      return blocks.stream()
          .filter(
              b ->
                  b.userId().equals(userId)
                      && b.taskId().isPresent()
                      && b.taskId().get().equals(taskId))
          .toList();
    }

    @Override
    public List<TimeBlock> findOverlappingByUserId(
        UUID userId, Instant rangeStart, Instant rangeEnd, UUID excludeId) {
      return blocks.stream()
          .filter(
              b ->
                  b.userId().equals(userId)
                      && b.status() != TimeBlockStatus.CANCELLED
                      && (excludeId == null || !b.id().equals(excludeId))
                      && b.overlaps(rangeStart, rangeEnd))
          .toList();
    }

    @Override
    public long countByTaskIdAndUserId(UUID taskId, UUID userId) {
      return blocks.stream()
          .filter(
              b ->
                  b.userId().equals(userId)
                      && b.taskId().isPresent()
                      && b.taskId().get().equals(taskId))
          .count();
    }

    @Override
    public void deleteById(UUID id) {
      blocks.removeIf(b -> b.id().equals(id));
    }
  }
}
