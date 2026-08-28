package tech.buildwithpartha.lifeos.note.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.goal.GoalOwnershipValidator;
import tech.buildwithpartha.lifeos.common.label.LabelOwnershipValidator;
import tech.buildwithpartha.lifeos.common.project.ProjectOwnershipValidator;
import tech.buildwithpartha.lifeos.common.task.TaskOwnershipValidator;
import tech.buildwithpartha.lifeos.note.domain.Note;
import tech.buildwithpartha.lifeos.note.domain.NoteLink;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;
import tech.buildwithpartha.lifeos.note.domain.NoteQuery;
import tech.buildwithpartha.lifeos.note.domain.NoteQueryResult;
import tech.buildwithpartha.lifeos.note.domain.NoteRepository;

/** Transactional service managing Note lifecycle, labels, and target links. */
@Service
public class NoteService {

  private final NoteRepository noteRepository;
  private final LabelOwnershipValidator labelOwnershipValidator;
  private final ProjectOwnershipValidator projectOwnershipValidator;
  private final TaskOwnershipValidator taskOwnershipValidator;
  private final GoalOwnershipValidator goalOwnershipValidator;
  private final Clock clock;

  public NoteService(
      NoteRepository noteRepository,
      LabelOwnershipValidator labelOwnershipValidator,
      ProjectOwnershipValidator projectOwnershipValidator,
      TaskOwnershipValidator taskOwnershipValidator,
      GoalOwnershipValidator goalOwnershipValidator,
      Clock clock) {
    this.noteRepository = Objects.requireNonNull(noteRepository, "noteRepository must not be null");
    this.labelOwnershipValidator =
        Objects.requireNonNull(labelOwnershipValidator, "labelOwnershipValidator must not be null");
    this.projectOwnershipValidator =
        Objects.requireNonNull(
            projectOwnershipValidator, "projectOwnershipValidator must not be null");
    this.taskOwnershipValidator =
        Objects.requireNonNull(taskOwnershipValidator, "taskOwnershipValidator must not be null");
    this.goalOwnershipValidator =
        Objects.requireNonNull(goalOwnershipValidator, "goalOwnershipValidator must not be null");
    this.clock = Objects.requireNonNull(clock, "clock must not be null");
  }

  @Transactional
  public Note createNote(UUID userId, CreateNoteCommand command) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    // 1. Validate label ownership
    labelOwnershipValidator.validateOwnership(userId, command.labelIds());

    // 2. Validate target entity ownerships
    for (CreateNoteCommand.LinkRecord link : command.links()) {
      validateTarget(userId, link.targetType(), link.targetId());
    }

    UUID noteId = UUID.randomUUID();
    Instant now = clock.instant();

    List<NoteLink> links =
        command.links().stream()
            .map(
                l ->
                    new NoteLink(
                        UUID.randomUUID(), noteId, userId, l.targetType(), l.targetId(), now))
            .toList();

    Note note =
        new Note(
            noteId,
            userId,
            command.title(),
            command.body(),
            false,
            false,
            now,
            now,
            command.labelIds(),
            links,
            0L);

    return noteRepository.save(note);
  }

  @Transactional(readOnly = true)
  public Note getNote(UUID userId, UUID noteId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(noteId, "noteId must not be null");

    return noteRepository
        .findByIdAndUserId(noteId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Note not found"));
  }

  @Transactional
  public Note updateNote(
      UUID userId, UUID noteId, UpdateNoteCommand command, long expectedVersion) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(noteId, "noteId must not be null");
    Objects.requireNonNull(command, "command must not be null");

    Note existing = getNote(userId, noteId);
    validateVersion(existing, expectedVersion);

    // Validate labels and links
    labelOwnershipValidator.validateOwnership(userId, command.labelIds());
    for (UpdateNoteCommand.LinkRecord link : command.links()) {
      validateTarget(userId, link.targetType(), link.targetId());
    }

    Instant now = clock.instant();

    List<NoteLink> links =
        command.links().stream()
            .map(
                l ->
                    new NoteLink(
                        UUID.randomUUID(), noteId, userId, l.targetType(), l.targetId(), now))
            .toList();

    Note updated =
        existing.withUpdates(command.title(), command.body(), command.labelIds(), links, now);

    return noteRepository.save(updated);
  }

  @Transactional
  public void deleteNote(UUID userId, UUID noteId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(noteId, "noteId must not be null");

    Note existing = getNote(userId, noteId);
    noteRepository.delete(existing);
  }

  @Transactional(readOnly = true)
  public NoteQueryResult queryNotes(NoteQuery query) {
    Objects.requireNonNull(query, "query must not be null");
    return noteRepository.query(query);
  }

  @Transactional
  public Note pinNote(UUID userId, UUID noteId, long expectedVersion) {
    Note existing = getNote(userId, noteId);
    validateVersion(existing, expectedVersion);

    Note updated = existing.pin(clock.instant());
    return noteRepository.save(updated);
  }

  @Transactional
  public Note unpinNote(UUID userId, UUID noteId, long expectedVersion) {
    Note existing = getNote(userId, noteId);
    validateVersion(existing, expectedVersion);

    Note updated = existing.unpin(clock.instant());
    return noteRepository.save(updated);
  }

  @Transactional
  public Note archiveNote(UUID userId, UUID noteId, long expectedVersion) {
    Note existing = getNote(userId, noteId);
    validateVersion(existing, expectedVersion);

    Note updated = existing.archive(clock.instant());
    return noteRepository.save(updated);
  }

  @Transactional
  public Note restoreNote(UUID userId, UUID noteId, long expectedVersion) {
    Note existing = getNote(userId, noteId);
    validateVersion(existing, expectedVersion);

    Note updated = existing.restore(clock.instant());
    return noteRepository.save(updated);
  }

  private void validateTarget(UUID userId, NoteLinkTargetType targetType, UUID targetId) {
    switch (targetType) {
      case PROJECT -> {
        try {
          projectOwnershipValidator.validateAssignment(userId, targetId);
        } catch (Exception e) {
          throw new ResourceNotFoundException("Target project not found");
        }
      }
      case TASK -> {
        try {
          taskOwnershipValidator.validateAssignment(userId, targetId);
        } catch (Exception e) {
          throw new ResourceNotFoundException("Target task not found");
        }
      }
      case GOAL -> {
        try {
          goalOwnershipValidator.validateAssignment(userId, targetId);
        } catch (Exception e) {
          throw new ResourceNotFoundException("Target goal not found");
        }
      }
    }
  }

  private static void validateVersion(Note existing, long expectedVersion) {
    if (existing.version() != expectedVersion) {
      throw new ConcurrencyConflictException("Note version conflict");
    }
  }
}
