package tech.buildwithpartha.lifeos.timeblock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import tech.buildwithpartha.lifeos.common.error.ConcurrencyConflictException;
import tech.buildwithpartha.lifeos.common.error.ResourceNotFoundException;
import tech.buildwithpartha.lifeos.common.error.TimeBlockOverlapConflictException;
import tech.buildwithpartha.lifeos.timeblock.application.CreateTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.application.TimeBlockQuery;
import tech.buildwithpartha.lifeos.timeblock.application.TimeBlockService;
import tech.buildwithpartha.lifeos.timeblock.application.UpdateTimeBlockCommand;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

@ActiveProfiles("test")
@SpringBootTest
@Transactional
class TimeBlockIntegrationTests {

  @Autowired private TimeBlockService timeBlockService;

  private UUID userA;
  private UUID userB;

  @BeforeEach
  void setUp() {
    userA = UUID.randomUUID();
    userB = UUID.randomUUID();
  }

  @Test
  @DisplayName("Cross-user isolation: User A cannot query, view, or modify User B's time blocks")
  void crossUserIsolation() {
    CreateTimeBlockCommand createCmd =
        new CreateTimeBlockCommand(
            "User A Block",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T10:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false);

    TimeBlock blockA = timeBlockService.createTimeBlock(userA, createCmd);

    // User B query returns empty
    TimeBlockQuery queryB =
        new TimeBlockQuery(
            userB,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty());
    List<TimeBlock> blocksB = timeBlockService.queryTimeBlocks(queryB);
    assertThat(blocksB).isEmpty();

    // User B get by ID throws ResourceNotFoundException
    assertThatThrownBy(() -> timeBlockService.getTimeBlock(userB, blockA.id()))
        .isInstanceOf(ResourceNotFoundException.class);

    // User B update throws ResourceNotFoundException
    UpdateTimeBlockCommand updateCmd =
        new UpdateTimeBlockCommand(
            "Hacked Title",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            blockA.startAt(),
            blockA.endAt(),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            blockA.version(),
            false);

    assertThatThrownBy(() -> timeBlockService.updateTimeBlock(userB, blockA.id(), updateCmd))
        .isInstanceOf(ResourceNotFoundException.class);

    // User B delete throws ResourceNotFoundException
    assertThatThrownBy(() -> timeBlockService.deleteTimeBlock(userB, blockA.id()))
        .isInstanceOf(ResourceNotFoundException.class);
  }

  @Test
  @DisplayName("Optimistic locking: Stale version updates raise ConcurrencyConflictException")
  void optimisticLockingConcurrency() {
    CreateTimeBlockCommand createCmd =
        new CreateTimeBlockCommand(
            "Concurrent Block",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T10:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false);

    TimeBlock block = timeBlockService.createTimeBlock(userA, createCmd);

    // First update succeeds
    UpdateTimeBlockCommand updateCmd1 =
        new UpdateTimeBlockCommand(
            "First Update",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            block.startAt(),
            block.endAt(),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            block.version(),
            false);

    TimeBlock updated = timeBlockService.updateTimeBlock(userA, block.id(), updateCmd1);

    // Stale update using original version throws ConcurrencyConflictException
    UpdateTimeBlockCommand staleUpdateCmd =
        new UpdateTimeBlockCommand(
            "Stale Update",
            "WORK",
            TimeBlockStatus.SCHEDULED,
            block.startAt(),
            block.endAt(),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            block.version(), // Stale version
            false);

    assertThatThrownBy(() -> timeBlockService.updateTimeBlock(userA, block.id(), staleUpdateCmd))
        .isInstanceOf(ConcurrencyConflictException.class);
  }

  @Test
  @DisplayName("Overlap detection and explicit override flow in database integration")
  void overlapDetectionAndOverrideFlow() {
    CreateTimeBlockCommand cmd1 =
        new CreateTimeBlockCommand(
            "Block 1",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T09:00:00Z"),
            Instant.parse("2026-08-24T11:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false);

    TimeBlock block1 = timeBlockService.createTimeBlock(userA, cmd1);

    // Attempt overlapping block without override
    CreateTimeBlockCommand cmd2Conflict =
        new CreateTimeBlockCommand(
            "Block 2",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T10:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            false);

    assertThatThrownBy(() -> timeBlockService.createTimeBlock(userA, cmd2Conflict))
        .isInstanceOf(TimeBlockOverlapConflictException.class);

    // Attempt overlapping block with override
    CreateTimeBlockCommand cmd2Override =
        new CreateTimeBlockCommand(
            "Block 2 Overridden",
            "FOCUS",
            TimeBlockStatus.SCHEDULED,
            Instant.parse("2026-08-24T10:00:00Z"),
            Instant.parse("2026-08-24T12:00:00Z"),
            "UTC",
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            true);

    TimeBlock block2 = timeBlockService.createTimeBlock(userA, cmd2Override);
    assertThat(block2.id()).isNotEqualTo(block1.id());
  }
}
