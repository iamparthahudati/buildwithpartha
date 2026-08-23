package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.activity.ActivityEventType;
import tech.buildwithpartha.lifeos.common.activity.ActivitySubjectType;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityCommand;
import tech.buildwithpartha.lifeos.common.activity.ProductActivityPort;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.TimeBlockOverlapConflictException;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Application service orchestrating TimeBlock CRUD, overlap detection, and operations. */
@Service
@Transactional
public class TimeBlockService {

  private final TimeBlockRepository timeBlockRepository;
  private final Optional<ProjectOwnershipValidator> projectValidator;
  private final Optional<TaskOwnershipValidator> taskValidator;
  private final Optional<ProductActivityPort> activityPort;
  private final Clock clock;

  public TimeBlockService(
      TimeBlockRepository timeBlockRepository,
      Optional<ProjectOwnershipValidator> projectValidator,
      Optional<TaskOwnershipValidator> taskValidator,
      Optional<ProductActivityPort> activityPort,
      Clock clock) {
    this.timeBlockRepository =
        Objects.requireNonNull(timeBlockRepository, "timeBlockRepository must not be null");
    this.projectValidator = projectValidator == null ? Optional.empty() : projectValidator;
    this.taskValidator = taskValidator == null ? Optional.empty() : taskValidator;
    this.activityPort = activityPort == null ? Optional.empty() : activityPort;
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Transactional(readOnly = true)
  public List<TimeBlock> queryTimeBlocks(TimeBlockQuery query) {
    Objects.requireNonNull(query, "query must not be null");
    UUID userId = query.userId();

    if (query.date().isPresent()) {
      ZoneId zone = ZoneId.of(query.timeZone().orElse("UTC"));
      Instant start = query.date().get().atStartOfDay(zone).toInstant();
      Instant end = query.date().get().plusDays(1).atStartOfDay(zone).toInstant();
      return timeBlockRepository.findByUserIdAndRange(userId, start, end);
    }

    if (query.rangeStart().isPresent() && query.rangeEnd().isPresent()) {
      return timeBlockRepository.findByUserIdAndRange(
          userId, query.rangeStart().get(), query.rangeEnd().get());
    }

    if (query.projectId().isPresent()) {
      return timeBlockRepository.findByUserIdAndProjectId(userId, query.projectId().get());
    }

    if (query.taskId().isPresent()) {
      return timeBlockRepository.findByUserIdAndTaskId(userId, query.taskId().get());
    }

    return timeBlockRepository.findByUserId(userId);
  }

  @Transactional(readOnly = true)
  public TimeBlock getTimeBlock(UUID userId, UUID id) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    return timeBlockRepository
        .findByIdAndUserId(id, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Time block not found"));
  }

  public TimeBlock createTimeBlock(UUID userId, CreateTimeBlockCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    command
        .projectId()
        .ifPresent(pId -> projectValidator.ifPresent(v -> v.validateAssignment(userId, pId)));
    command
        .taskId()
        .ifPresent(tId -> taskValidator.ifPresent(v -> v.validateAssignment(userId, tId)));

    checkOverlapConflict(userId, command.startAt(), command.endAt(), null, command.allowOverlap());

    Instant now = clock.instant();
    TimeBlockStatus status =
        command.status() != null ? command.status() : TimeBlockStatus.SCHEDULED;

    TimeBlock timeBlock =
        new TimeBlock(
            UUID.randomUUID(),
            userId,
            command.projectId(),
            command.taskId(),
            command.title(),
            command.category(),
            status,
            command.startAt(),
            command.endAt(),
            command.sourceTimeZone(),
            command.notes(),
            now,
            now,
            0L);

    TimeBlock saved = timeBlockRepository.save(timeBlock);
    recordActivity(saved, ActivityEventType.TASK_UPDATED);
    return saved;
  }

  public TimeBlock updateTimeBlock(UUID userId, UUID id, UpdateTimeBlockCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(command, "command must not be null");

    TimeBlock existing = getTimeBlock(userId, id);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Time block was modified by another request");
    }

    command
        .projectId()
        .ifPresent(pId -> projectValidator.ifPresent(v -> v.validateAssignment(userId, pId)));
    command
        .taskId()
        .ifPresent(tId -> taskValidator.ifPresent(v -> v.validateAssignment(userId, tId)));

    checkOverlapConflict(userId, command.startAt(), command.endAt(), id, command.allowOverlap());

    Instant now = clock.instant();
    TimeBlock updated =
        new TimeBlock(
            existing.id(),
            userId,
            command.projectId(),
            command.taskId(),
            command.title(),
            command.category(),
            command.status(),
            command.startAt(),
            command.endAt(),
            command.sourceTimeZone(),
            command.notes(),
            existing.createdAt(),
            now,
            existing.version());

    TimeBlock saved = timeBlockRepository.save(updated);
    recordActivity(saved, ActivityEventType.TASK_UPDATED);
    return saved;
  }

  public TimeBlock moveTimeBlock(UUID userId, UUID id, MoveTimeBlockCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(command, "command must not be null");

    TimeBlock existing = getTimeBlock(userId, id);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Time block was modified by another request");
    }

    checkOverlapConflict(userId, command.startAt(), command.endAt(), id, command.allowOverlap());

    Instant now = clock.instant();
    TimeBlock moved =
        new TimeBlock(
            existing.id(),
            userId,
            existing.projectId(),
            existing.taskId(),
            existing.title(),
            existing.category(),
            existing.status(),
            command.startAt(),
            command.endAt(),
            existing.sourceTimeZone(),
            existing.notes(),
            existing.createdAt(),
            now,
            existing.version());

    TimeBlock saved = timeBlockRepository.save(moved);
    recordActivity(saved, ActivityEventType.TASK_UPDATED);
    return saved;
  }

  public TimeBlock resizeTimeBlock(UUID userId, UUID id, ResizeTimeBlockCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(command, "command must not be null");

    TimeBlock existing = getTimeBlock(userId, id);

    if (existing.version() != command.version()) {
      throw new ConcurrencyConflictException("Time block was modified by another request");
    }

    checkOverlapConflict(userId, command.startAt(), command.endAt(), id, command.allowOverlap());

    Instant now = clock.instant();
    TimeBlock resized =
        new TimeBlock(
            existing.id(),
            userId,
            existing.projectId(),
            existing.taskId(),
            existing.title(),
            existing.category(),
            existing.status(),
            command.startAt(),
            command.endAt(),
            existing.sourceTimeZone(),
            existing.notes(),
            existing.createdAt(),
            now,
            existing.version());

    TimeBlock saved = timeBlockRepository.save(resized);
    recordActivity(saved, ActivityEventType.TASK_UPDATED);
    return saved;
  }

  public TimeBlock changeStatus(UUID userId, UUID id, ChangeTimeBlockStatusCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(command, "command must not be null");

    TimeBlock existing = getTimeBlock(userId, id);

    if (command.version().isPresent() && existing.version() != command.version().get()) {
      throw new ConcurrencyConflictException("Time block was modified by another request");
    }

    Instant now = clock.instant();
    TimeBlock statusChanged =
        new TimeBlock(
            existing.id(),
            userId,
            existing.projectId(),
            existing.taskId(),
            existing.title(),
            existing.category(),
            command.status(),
            existing.startAt(),
            existing.endAt(),
            existing.sourceTimeZone(),
            existing.notes(),
            existing.createdAt(),
            now,
            existing.version());

    TimeBlock saved = timeBlockRepository.save(statusChanged);
    recordActivity(saved, ActivityEventType.TASK_UPDATED);
    return saved;
  }

  public TimeBlock duplicateTimeBlock(UUID userId, UUID id, DuplicateTimeBlockCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");
    Objects.requireNonNull(command, "command must not be null");

    TimeBlock existing = getTimeBlock(userId, id);

    Duration duration = Duration.between(existing.startAt(), existing.endAt());
    Instant newStartAt;
    Instant newEndAt;

    if (command.startAt().isPresent() && command.endAt().isPresent()) {
      newStartAt = command.startAt().get();
      newEndAt = command.endAt().get();
    } else if (command.startAt().isPresent()) {
      newStartAt = command.startAt().get();
      newEndAt = newStartAt.plus(duration);
    } else {
      newStartAt = existing.endAt();
      newEndAt = existing.endAt().plus(duration);
    }

    checkOverlapConflict(userId, newStartAt, newEndAt, null, command.allowOverlap());

    Instant now = clock.instant();
    TimeBlock duplicated =
        new TimeBlock(
            UUID.randomUUID(),
            userId,
            existing.projectId(),
            existing.taskId(),
            existing.title(),
            existing.category(),
            TimeBlockStatus.SCHEDULED,
            newStartAt,
            newEndAt,
            existing.sourceTimeZone(),
            existing.notes(),
            now,
            now,
            0L);

    TimeBlock saved = timeBlockRepository.save(duplicated);
    recordActivity(saved, ActivityEventType.TASK_CREATED);
    return saved;
  }

  public void deleteTimeBlock(UUID userId, UUID id) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(id, "id must not be null");

    TimeBlock existing = getTimeBlock(userId, id);
    timeBlockRepository.deleteById(id);
    recordActivity(existing, ActivityEventType.TASK_DELETED);
  }

  @Transactional(readOnly = true)
  public OverlapCheckResult checkOverlap(
      UUID userId, Instant startAt, Instant endAt, Optional<UUID> excludeId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(startAt, "startAt must not be null");
    Objects.requireNonNull(endAt, "endAt must not be null");
    if (!endAt.isAfter(startAt)) {
      throw new IllegalArgumentException("endAt must be strictly after startAt");
    }

    List<TimeBlock> overlaps =
        timeBlockRepository.findOverlappingByUserId(userId, startAt, endAt, excludeId.orElse(null));
    return new OverlapCheckResult(!overlaps.isEmpty(), overlaps);
  }

  private void checkOverlapConflict(
      UUID userId, Instant startAt, Instant endAt, UUID excludeId, boolean allowOverlap) {
    if (allowOverlap) {
      return;
    }

    List<TimeBlock> overlaps =
        timeBlockRepository.findOverlappingByUserId(userId, startAt, endAt, excludeId);
    if (!overlaps.isEmpty()) {
      List<UUID> conflictIds = overlaps.stream().map(TimeBlock::id).toList();
      throw new TimeBlockOverlapConflictException(
          "This Time Block overlaps " + overlaps.size() + " existing block(s) in your schedule.",
          conflictIds);
    }
  }

  private void recordActivity(TimeBlock block, ActivityEventType eventType) {
    if (activityPort.isEmpty()) {
      return;
    }
    block
        .taskId()
        .ifPresent(
            tId -> {
              activityPort
                  .get()
                  .record(
                      new ProductActivityCommand(
                          block.userId(),
                          block.userId(),
                          eventType,
                          ActivitySubjectType.TASK,
                          tId));
            });
    block
        .projectId()
        .ifPresent(
            pId -> {
              activityPort
                  .get()
                  .record(
                      new ProductActivityCommand(
                          block.userId(),
                          block.userId(),
                          eventType,
                          ActivitySubjectType.PROJECT,
                          pId));
            });
  }
}
