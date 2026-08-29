package tech.buildwithpartha.lifeos.braindump.application;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItem;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQuery;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemQueryResult;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemRepository;
import tech.buildwithpartha.lifeos.braindump.domain.BrainDumpItemStatus;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToGoalCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToNoteCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToProjectCommand;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToTaskCommand;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.goal.BrainDumpGoalCreator;
import tech.buildwithpartha.lifeos.common.note.BrainDumpNoteCreator;
import tech.buildwithpartha.lifeos.common.project.BrainDumpProjectCreator;
import tech.buildwithpartha.lifeos.common.task.BrainDumpTaskCreator;

/** Transactional service for Brain Dump Item lifecycle and idempotent conversion (LOS-1204). */
@Service
public class BrainDumpService {

  private final BrainDumpItemRepository brainDumpItemRepository;
  private final BrainDumpTaskCreator taskCreator;
  private final BrainDumpNoteCreator noteCreator;
  private final BrainDumpProjectCreator projectCreator;
  private final BrainDumpGoalCreator goalCreator;
  private final Clock clock;

  public BrainDumpService(
      BrainDumpItemRepository brainDumpItemRepository,
      BrainDumpTaskCreator taskCreator,
      BrainDumpNoteCreator noteCreator,
      BrainDumpProjectCreator projectCreator,
      BrainDumpGoalCreator goalCreator,
      Clock clock) {
    this.brainDumpItemRepository =
        Objects.requireNonNull(brainDumpItemRepository, "brainDumpItemRepository must not be null");
    this.taskCreator = Objects.requireNonNull(taskCreator, "taskCreator must not be null");
    this.noteCreator = Objects.requireNonNull(noteCreator, "noteCreator must not be null");
    this.projectCreator =
        Objects.requireNonNull(projectCreator, "projectCreator must not be null");
    this.goalCreator = Objects.requireNonNull(goalCreator, "goalCreator must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Transactional
  public BrainDumpItem capture(UUID userId, CaptureBrainDumpCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Instant now = clock.instant();
    BrainDumpItem item =
        new BrainDumpItem(
            UUID.randomUUID(),
            userId,
            command.content(),
            BrainDumpItemStatus.UNPROCESSED,
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            java.util.Optional.empty(),
            now,
            now,
            0L);
    return brainDumpItemRepository.save(item);
  }

  @Transactional(readOnly = true)
  public BrainDumpItem getItem(UUID userId, UUID itemId) {
    return brainDumpItemRepository
        .findByIdAndUserId(itemId, userId)
        .orElseThrow(
            () -> new ResourceNotFoundException("Brain dump item not found: " + itemId));
  }

  @Transactional(readOnly = true)
  public BrainDumpItemQueryResult listItems(BrainDumpItemQuery query) {
    Objects.requireNonNull(query, "query must not be null");
    return brainDumpItemRepository.query(query);
  }

  @Transactional
  public BrainDumpItem updateContent(
      UUID userId, UUID itemId, UpdateBrainDumpContentCommand command, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);
    checkVersion(existing, version);

    Instant now = clock.instant();
    BrainDumpItem updated =
        new BrainDumpItem(
            existing.id(),
            existing.userId(),
            command.content(),
            existing.status(),
            existing.convertedToType(),
            existing.convertedToId(),
            existing.convertedAt(),
            existing.archivedAt(),
            existing.createdAt(),
            now,
            existing.version());
    return brainDumpItemRepository.save(updated);
  }

  @Transactional
  public BrainDumpItem defer(UUID userId, UUID itemId, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);
    checkVersion(existing, version);
    return brainDumpItemRepository.save(existing.defer(clock.instant()));
  }

  @Transactional
  public BrainDumpItem archive(UUID userId, UUID itemId, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);
    checkVersion(existing, version);
    return brainDumpItemRepository.save(existing.archive(clock.instant()));
  }

  @Transactional
  public BrainDumpItem restore(UUID userId, UUID itemId, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);
    checkVersion(existing, version);
    return brainDumpItemRepository.save(existing.restore(clock.instant()));
  }

  @Transactional
  public void delete(UUID userId, UUID itemId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);
    brainDumpItemRepository.delete(existing);
  }

  /** Idempotent conversion: if already converted, returns the existing item unchanged. */
  @Transactional
  public BrainDumpItem convertToTask(
      UUID userId, UUID itemId, ConvertToTaskCommand command, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);

    // Idempotency: already converted, return as-is
    if (existing.status() == BrainDumpItemStatus.CONVERTED) {
      return existing;
    }

    checkVersion(existing, version);

    UUID targetId = taskCreator.createTask(userId, command);
    BrainDumpItem converted = existing.convert("TASK", targetId, clock.instant());
    return brainDumpItemRepository.save(converted);
  }

  /** Idempotent conversion: if already converted, returns the existing item unchanged. */
  @Transactional
  public BrainDumpItem convertToNote(
      UUID userId, UUID itemId, ConvertToNoteCommand command, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);

    if (existing.status() == BrainDumpItemStatus.CONVERTED) {
      return existing;
    }

    checkVersion(existing, version);

    UUID targetId = noteCreator.createNote(userId, command);
    BrainDumpItem converted = existing.convert("NOTE", targetId, clock.instant());
    return brainDumpItemRepository.save(converted);
  }

  /** Idempotent conversion: if already converted, returns the existing item unchanged. */
  @Transactional
  public BrainDumpItem convertToProject(
      UUID userId, UUID itemId, ConvertToProjectCommand command, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);

    if (existing.status() == BrainDumpItemStatus.CONVERTED) {
      return existing;
    }

    checkVersion(existing, version);

    UUID targetId = projectCreator.createProject(userId, command);
    BrainDumpItem converted = existing.convert("PROJECT", targetId, clock.instant());
    return brainDumpItemRepository.save(converted);
  }

  /** Idempotent conversion: if already converted, returns the existing item unchanged. */
  @Transactional
  public BrainDumpItem convertToGoal(
      UUID userId, UUID itemId, ConvertToGoalCommand command, long version) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(itemId, "itemId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    BrainDumpItem existing = requireOwnedItem(userId, itemId);

    if (existing.status() == BrainDumpItemStatus.CONVERTED) {
      return existing;
    }

    checkVersion(existing, version);

    UUID targetId = goalCreator.createGoal(userId, command);
    BrainDumpItem converted = existing.convert("GOAL", targetId, clock.instant());
    return brainDumpItemRepository.save(converted);
  }

  private BrainDumpItem requireOwnedItem(UUID userId, UUID itemId) {
    return brainDumpItemRepository
        .findByIdAndUserId(itemId, userId)
        .orElseThrow(
            () -> new ResourceNotFoundException("Brain dump item not found: " + itemId));
  }

  private void checkVersion(BrainDumpItem item, long expectedVersion) {
    if (item.version() != expectedVersion) {
      throw new ConcurrencyConflictException(
          "Brain dump item was modified concurrently: " + item.id());
    }
  }
}
