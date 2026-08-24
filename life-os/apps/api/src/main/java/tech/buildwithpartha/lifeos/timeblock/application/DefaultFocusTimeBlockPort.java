package tech.buildwithpartha.lifeos.timeblock.application;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import tech.buildwithpartha.lifeos.common.error.FieldProblem;
import tech.buildwithpartha.lifeos.common.error.FieldValidationException;
import tech.buildwithpartha.lifeos.common.focus.FocusTimeBlockPort;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockRepository;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

/** Time Block-owned implementation of Focus Session lifecycle reconciliation. */
@Service
public class DefaultFocusTimeBlockPort implements FocusTimeBlockPort {

  private final TimeBlockRepository timeBlockRepository;

  public DefaultFocusTimeBlockPort(TimeBlockRepository timeBlockRepository) {
    this.timeBlockRepository = timeBlockRepository;
  }

  @Override
  public Optional<UUID> startFocus(UUID userId, UUID timeBlockId, Instant now) {
    TimeBlock block = requireOwnedBlock(userId, timeBlockId);
    if (block.status().isTerminal()) {
      throw new FieldValidationException(
          "Time Block cannot start focus",
          List.of(new FieldProblem("timeBlockId", "TIME_BLOCK_NOT_AVAILABLE_FOR_FOCUS")));
    }
    if (block.status() == TimeBlockStatus.SCHEDULED) {
      timeBlockRepository.save(block.withStatus(TimeBlockStatus.IN_PROGRESS, now));
    }
    return block.taskId();
  }

  @Override
  public void completeFocus(UUID userId, UUID timeBlockId, Instant now) {
    TimeBlock block = requireOwnedBlock(userId, timeBlockId);
    if (block.status() != TimeBlockStatus.COMPLETED
        && block.status() != TimeBlockStatus.CANCELLED) {
      timeBlockRepository.save(block.withStatus(TimeBlockStatus.COMPLETED, now));
    }
  }

  @Override
  public void cancelFocus(UUID userId, UUID timeBlockId, Instant now) {
    TimeBlock block = requireOwnedBlock(userId, timeBlockId);
    if (block.status() == TimeBlockStatus.IN_PROGRESS) {
      timeBlockRepository.save(block.withStatus(TimeBlockStatus.SCHEDULED, now));
    }
  }

  private TimeBlock requireOwnedBlock(UUID userId, UUID timeBlockId) {
    return timeBlockRepository
        .findByIdAndUserId(timeBlockId, userId)
        .orElseThrow(
            () ->
                new FieldValidationException(
                    "Time Block is not available",
                    List.of(new FieldProblem("timeBlockId", "INVALID_TIME_BLOCK"))));
  }
}
