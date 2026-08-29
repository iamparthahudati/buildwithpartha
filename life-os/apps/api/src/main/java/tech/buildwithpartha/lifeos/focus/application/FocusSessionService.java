package tech.buildwithpartha.lifeos.focus.application;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.error.FocusSessionConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.focus.FocusTaskPort;
import tech.buildwithpartha.lifeos.common.focus.FocusTimeBlockPort;
import tech.buildwithpartha.lifeos.focus.domain.FocusSession;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruption;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionInterruptionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperation;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperationRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionOperationType;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionPhase;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionRepository;
import tech.buildwithpartha.lifeos.focus.domain.FocusSessionStatus;

/**
 * Transactional, server-clock-authoritative orchestration for Focus Session writes and recovery.
 */
@Service
@Transactional
public class FocusSessionService {

  private final FocusSessionRepository sessionRepository;
  private final FocusSessionInterruptionRepository interruptionRepository;
  private final FocusSessionOperationRepository operationRepository;
  private final FocusTaskPort taskPort;
  private final FocusTimeBlockPort timeBlockPort;
  private final Clock clock;

  public FocusSessionService(
      FocusSessionRepository sessionRepository,
      FocusSessionInterruptionRepository interruptionRepository,
      FocusSessionOperationRepository operationRepository,
      FocusTaskPort taskPort,
      FocusTimeBlockPort timeBlockPort,
      Clock clock) {
    this.sessionRepository = Objects.requireNonNull(sessionRepository);
    this.interruptionRepository = Objects.requireNonNull(interruptionRepository);
    this.operationRepository = Objects.requireNonNull(operationRepository);
    this.taskPort = Objects.requireNonNull(taskPort);
    this.timeBlockPort = Objects.requireNonNull(timeBlockPort);
    this.clock = Objects.requireNonNull(clock);
  }

  @Transactional(readOnly = true)
  public FocusSessionSnapshot getSession(UUID userId, UUID sessionId) {
    return snapshot(requireSession(userId, sessionId));
  }

  @Transactional(readOnly = true)
  public Optional<FocusSessionSnapshot> getActiveSession(UUID userId) {
    Objects.requireNonNull(userId, "userId must not be null");
    return sessionRepository.findActiveByUserId(userId).map(this::snapshot);
  }

  public FocusSessionSnapshot start(
      UUID userId, StartFocusSessionCommand command, String idempotencyKey) {
    requireInputs(userId, idempotencyKey);
    Objects.requireNonNull(command, "command must not be null");
    sessionRepository.lockUser(userId);

    Optional<FocusSessionOperation> replay =
        replay(userId, idempotencyKey, FocusSessionOperationType.START, Optional.empty());
    if (replay.isPresent()) {
      return snapshot(requireSession(userId, replay.get().focusSessionId()));
    }
    if (sessionRepository.findActiveByUserId(userId).isPresent()) {
      throw FocusSessionConflictException.alreadyActive();
    }

    Instant now = clock.instant();
    command.taskId().ifPresent(taskId -> taskPort.validateStart(userId, taskId));
    Optional<UUID> blockTaskId =
        command
            .timeBlockId()
            .flatMap(timeBlockId -> timeBlockPort.startFocus(userId, timeBlockId, now));
    if (command.taskId().isPresent()
        && blockTaskId.isPresent()
        && !command.taskId().get().equals(blockTaskId.get())) {
      throw new FieldValidationException(
          "Focus context does not match",
          List.of(new FieldProblem("taskId", "TIME_BLOCK_TASK_MISMATCH")));
    }
    Optional<UUID> effectiveTaskId = command.taskId().or(() -> blockTaskId);
    if (command.taskId().isEmpty()) {
      effectiveTaskId.ifPresent(taskId -> taskPort.validateStart(userId, taskId));
    }

    FocusSession saved =
        sessionRepository.save(
            FocusSession.start(
                UUID.randomUUID(),
                userId,
                effectiveTaskId,
                command.timeBlockId(),
                command.plannedFocusDuration(),
                command.plannedBreakDuration(),
                now));
    recordOperation(
        userId, idempotencyKey, FocusSessionOperationType.START, saved.id(), Optional.empty(), now);
    return snapshot(saved);
  }

  public FocusSessionSnapshot pause(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(userId, sessionId, version, idempotencyKey, FocusSessionOperationType.PAUSE);
  }

  public FocusSessionSnapshot resume(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(userId, sessionId, version, idempotencyKey, FocusSessionOperationType.RESUME);
  }

  public FocusSessionSnapshot startBreak(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(
        userId, sessionId, version, idempotencyKey, FocusSessionOperationType.START_BREAK);
  }

  public FocusSessionSnapshot resumeFocus(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(
        userId, sessionId, version, idempotencyKey, FocusSessionOperationType.RESUME_FOCUS);
  }

  public FocusSessionSnapshot complete(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(
        userId, sessionId, version, idempotencyKey, FocusSessionOperationType.COMPLETE);
  }

  public FocusSessionSnapshot cancel(
      UUID userId, UUID sessionId, long version, String idempotencyKey) {
    return transition(userId, sessionId, version, idempotencyKey, FocusSessionOperationType.CANCEL);
  }

  public FocusSessionSnapshot recordInterruption(
      UUID userId, UUID sessionId, long version, String note, String idempotencyKey) {
    requireInputs(userId, idempotencyKey);
    Objects.requireNonNull(sessionId, "sessionId must not be null");
    sessionRepository.lockUser(userId);
    Optional<FocusSessionOperation> replay =
        replay(
            userId,
            idempotencyKey,
            FocusSessionOperationType.RECORD_INTERRUPTION,
            Optional.of(sessionId));
    if (replay.isPresent()) {
      UUID interruptionId = replay.get().interruptionId().orElseThrow();
      interruptionRepository
          .findByIdAndUserId(interruptionId, userId)
          .orElseThrow(() -> new ResourceNotFoundException("Interruption not found"));
      return snapshot(requireSession(userId, sessionId));
    }

    FocusSession session = requireSession(userId, sessionId);
    checkVersion(session, version);
    Instant now = authoritativeNow(session);
    FocusSessionInterruption interruption =
        interruptionRepository.save(session.recordInterruption(UUID.randomUUID(), now, note));
    recordOperation(
        userId,
        idempotencyKey,
        FocusSessionOperationType.RECORD_INTERRUPTION,
        sessionId,
        Optional.of(interruption.id()),
        now);
    return snapshot(session);
  }

  private FocusSessionSnapshot transition(
      UUID userId,
      UUID sessionId,
      long version,
      String idempotencyKey,
      FocusSessionOperationType operationType) {
    requireInputs(userId, idempotencyKey);
    Objects.requireNonNull(sessionId, "sessionId must not be null");
    sessionRepository.lockUser(userId);
    Optional<FocusSessionOperation> replay =
        replay(userId, idempotencyKey, operationType, Optional.of(sessionId));
    if (replay.isPresent()) {
      return snapshot(requireSession(userId, sessionId));
    }

    FocusSession session = requireSession(userId, sessionId);
    checkVersion(session, version);
    Instant now = authoritativeNow(session);
    FocusSession transitioned = applyTransition(session, operationType, now);
    FocusSession saved = transitioned == session ? session : sessionRepository.save(transitioned);
    if (transitioned != session) {
      reconcileContext(saved, operationType, now);
    }
    recordOperation(userId, idempotencyKey, operationType, sessionId, Optional.empty(), now);
    return snapshot(saved);
  }

  private FocusSession applyTransition(
      FocusSession session, FocusSessionOperationType operationType, Instant now) {
    return switch (operationType) {
      case PAUSE -> {
        if (session.status() == FocusSessionStatus.PAUSED) {
          yield session;
        }
        requireState(session.status() == FocusSessionStatus.RUNNING);
        yield session.pause(now);
      }
      case RESUME -> {
        if (session.status() == FocusSessionStatus.RUNNING) {
          yield session;
        }
        requireState(session.status() == FocusSessionStatus.PAUSED);
        yield session.resume(now);
      }
      case START_BREAK -> {
        if (session.status() == FocusSessionStatus.RUNNING
            && session.phase() == FocusSessionPhase.BREAK) {
          yield session;
        }
        requireState(
            session.status() == FocusSessionStatus.RUNNING
                && session.phase() == FocusSessionPhase.FOCUS);
        yield session.startBreak(now);
      }
      case RESUME_FOCUS -> {
        if (session.status() == FocusSessionStatus.RUNNING
            && session.phase() == FocusSessionPhase.FOCUS) {
          yield session;
        }
        requireState(
            session.status() == FocusSessionStatus.RUNNING
                && session.phase() == FocusSessionPhase.BREAK);
        yield session.resumeFocus(now);
      }
      case COMPLETE -> {
        if (session.status() == FocusSessionStatus.COMPLETED) {
          yield session;
        }
        requireState(session.status().isActive());
        yield session.complete(now);
      }
      case CANCEL -> {
        if (session.status() == FocusSessionStatus.CANCELLED) {
          yield session;
        }
        requireState(session.status().isActive());
        yield session.cancel(now);
      }
      case START, RECORD_INTERRUPTION ->
          throw new IllegalArgumentException("Unsupported transition operation");
    };
  }

  private void reconcileContext(
      FocusSession session, FocusSessionOperationType operationType, Instant now) {
    if (operationType == FocusSessionOperationType.COMPLETE) {
      int completedMinutes = Math.toIntExact(session.actualFocusDuration().toMinutes());
      session
          .taskId()
          .ifPresent(
              taskId ->
                  taskPort.recordCompletedMinutes(session.userId(), taskId, completedMinutes, now));
      session
          .timeBlockId()
          .ifPresent(blockId -> timeBlockPort.completeFocus(session.userId(), blockId, now));
    } else if (operationType == FocusSessionOperationType.CANCEL) {
      session
          .timeBlockId()
          .ifPresent(blockId -> timeBlockPort.cancelFocus(session.userId(), blockId, now));
    }
  }

  private Optional<FocusSessionOperation> replay(
      UUID userId,
      String idempotencyKey,
      FocusSessionOperationType expectedType,
      Optional<UUID> expectedSessionId) {
    Optional<FocusSessionOperation> existing =
        operationRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey.trim());
    if (existing.isEmpty()) {
      return Optional.empty();
    }
    FocusSessionOperation operation = existing.get();
    if (operation.type() != expectedType
        || expectedSessionId.filter(id -> !id.equals(operation.focusSessionId())).isPresent()) {
      throw FocusSessionConflictException.reusedIdempotencyKey();
    }
    return existing;
  }

  private void recordOperation(
      UUID userId,
      String idempotencyKey,
      FocusSessionOperationType type,
      UUID sessionId,
      Optional<UUID> interruptionId,
      Instant now) {
    operationRepository.save(
        new FocusSessionOperation(
            UUID.randomUUID(), userId, idempotencyKey, type, sessionId, interruptionId, now));
  }

  private FocusSession requireSession(UUID userId, UUID sessionId) {
    Objects.requireNonNull(userId, "userId must not be null");
    Objects.requireNonNull(sessionId, "sessionId must not be null");
    return sessionRepository
        .findByIdAndUserId(sessionId, userId)
        .orElseThrow(() -> new ResourceNotFoundException("Focus Session not found"));
  }

  private FocusSessionSnapshot snapshot(FocusSession session) {
    Instant serverNow = authoritativeNow(session);
    return new FocusSessionSnapshot(
        session,
        interruptionRepository.findByFocusSessionIdAndUserId(session.id(), session.userId()),
        serverNow,
        session.actualFocusDurationAt(serverNow),
        session.actualBreakDurationAt(serverNow));
  }

  private Instant authoritativeNow(FocusSession session) {
    Instant serverNow = clock.instant();
    return serverNow.isBefore(session.updatedAt()) ? session.updatedAt() : serverNow;
  }

  private static void checkVersion(FocusSession session, long version) {
    if (version < 0 || session.version() != version) {
      throw new ConcurrencyConflictException("Focus Session was updated by another request");
    }
  }

  private static void requireState(boolean condition) {
    if (!condition) {
      throw FocusSessionConflictException.invalidState("Focus Session transition is not valid");
    }
  }

  private static void requireInputs(UUID userId, String idempotencyKey) {
    Objects.requireNonNull(userId, "userId must not be null");
    if (idempotencyKey == null
        || !idempotencyKey.trim().matches("[A-Za-z0-9][A-Za-z0-9._-]{7,63}")) {
      throw new FieldValidationException(
          "Idempotency key is invalid",
          List.of(new FieldProblem("Idempotency-Key", "INVALID_IDEMPOTENCY_KEY")));
    }
  }
}
