package tech.buildwithpartha.lifeos.timeblock.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockDomainFixture.aTimeBlock;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlock;
import tech.buildwithpartha.lifeos.timeblock.domain.TimeBlockStatus;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaTimeBlockRepositoryTests {

  @Autowired private TimeBlockJpaRepository timeBlockJpaRepository;

  @Test
  @DisplayName("Saved time block round-trips correctly through JpaTimeBlockRepository")
  void roundTripsTimeBlock() {
    JpaTimeBlockRepository repository = new JpaTimeBlockRepository(timeBlockJpaRepository);

    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();
    Instant start = Instant.parse("2026-08-24T09:00:00Z");
    Instant end = Instant.parse("2026-08-24T10:30:00Z");

    TimeBlock timeBlock =
        aTimeBlock()
            .withId(id)
            .withUserId(userId)
            .withProjectId(projectId)
            .withTaskId(taskId)
            .withTitle("Deep Work Session")
            .withCategory("DEEP_WORK")
            .withStatus(TimeBlockStatus.SCHEDULED)
            .withStartAt(start)
            .withEndAt(end)
            .withSourceTimeZone("America/New_York")
            .withNotes("Focus on architecture")
            .build();

    TimeBlock saved = repository.save(timeBlock);
    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.projectId()).contains(projectId);
    assertThat(saved.taskId()).contains(taskId);
    assertThat(saved.title()).isEqualTo("Deep Work Session");
    assertThat(saved.category()).isEqualTo("DEEP_WORK");
    assertThat(saved.status()).isEqualTo(TimeBlockStatus.SCHEDULED);

    Optional<TimeBlock> fetched = repository.findById(id);
    assertThat(fetched).isPresent();
    assertThat(fetched.get().title()).isEqualTo("Deep Work Session");
    assertThat(fetched.get().notes()).contains("Focus on architecture");

    Optional<TimeBlock> userFetched = repository.findByIdAndUserId(id, userId);
    assertThat(userFetched).isPresent();

    Optional<TimeBlock> wrongUserFetched = repository.findByIdAndUserId(id, UUID.randomUUID());
    assertThat(wrongUserFetched).isEmpty();
  }

  @Test
  @DisplayName("findByUserIdAndRange returns only time blocks overlapping the specified range")
  void queriesByUserIdAndRange() {
    JpaTimeBlockRepository repository = new JpaTimeBlockRepository(timeBlockJpaRepository);
    UUID userId = UUID.randomUUID();

    // Block 1: 08:00 - 09:00
    TimeBlock b1 =
        aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T08:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T09:00:00Z"))
            .build();

    // Block 2: 09:30 - 10:30
    TimeBlock b2 =
        aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T09:30:00Z"))
            .withEndAt(Instant.parse("2026-08-24T10:30:00Z"))
            .build();

    // Block 3: 11:00 - 12:00
    TimeBlock b3 =
        aTimeBlock()
            .withUserId(userId)
            .withStartAt(Instant.parse("2026-08-24T11:00:00Z"))
            .withEndAt(Instant.parse("2026-08-24T12:00:00Z"))
            .build();

    repository.save(b1);
    repository.save(b2);
    repository.save(b3);

    // Range: 08:45 - 10:00 (should overlap b1 and b2)
    List<TimeBlock> rangeBlocks =
        repository.findByUserIdAndRange(
            userId, Instant.parse("2026-08-24T08:45:00Z"), Instant.parse("2026-08-24T10:00:00Z"));

    assertThat(rangeBlocks).extracting(TimeBlock::id).containsExactly(b1.id(), b2.id());
  }

  @Test
  @DisplayName("queries by project, task, count, and delete work correctly")
  void queriesByProjectTaskAndDeletes() {
    JpaTimeBlockRepository repository = new JpaTimeBlockRepository(timeBlockJpaRepository);
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    UUID taskId = UUID.randomUUID();

    TimeBlock b1 =
        aTimeBlock().withUserId(userId).withProjectId(projectId).withTaskId(taskId).build();
    repository.save(b1);

    assertThat(repository.findByProjectId(projectId)).hasSize(1);
    assertThat(repository.findByTaskId(taskId)).hasSize(1);
    assertThat(repository.countByTaskIdAndUserId(taskId, userId)).isEqualTo(1L);

    repository.deleteById(b1.id());
    assertThat(repository.findById(b1.id())).isEmpty();
    assertThat(repository.countByTaskIdAndUserId(taskId, userId)).isEqualTo(0L);
  }
}
