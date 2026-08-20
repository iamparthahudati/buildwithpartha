package tech.buildwithpartha.lifeos.project.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaMilestoneRepositoryTests {

  @Autowired private MilestoneJpaRepository jpaRepository;

  @Test
  void savedMilestoneRoundTripsThroughTheJpaEntity() {
    JpaMilestoneRepository repository = new JpaMilestoneRepository(jpaRepository);
    UUID id = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");
    LocalDate date = LocalDate.of(2026, 8, 25);

    Milestone milestone =
        new Milestone(
            id,
            projectId,
            "Milestone A",
            Optional.of(date),
            MilestoneStatus.PLANNED,
            1,
            now,
            now,
            0L);

    Milestone saved = repository.save(milestone);
    jpaRepository.flush();

    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.projectId()).isEqualTo(projectId);
    assertThat(saved.title()).isEqualTo("Milestone A");
    assertThat(saved.date()).contains(date);
    assertThat(saved.status()).isEqualTo(MilestoneStatus.PLANNED);
    assertThat(saved.ordering()).isEqualTo(1);
    assertThat(saved.createdAt()).isEqualTo(now);
    assertThat(saved.updatedAt()).isEqualTo(now);
    assertThat(saved.version()).isZero();

    Milestone reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.title()).isEqualTo("Milestone A");
  }

  @Test
  void findByIdMapsMilestoneWithNullDate() {
    JpaMilestoneRepository repository = new JpaMilestoneRepository(jpaRepository);
    UUID id = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Milestone milestone =
        new Milestone(
            id,
            projectId,
            "Milestone A",
            Optional.empty(),
            MilestoneStatus.COMPLETED,
            2,
            now,
            now,
            0L);

    repository.save(milestone);
    jpaRepository.flush();

    Milestone reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.date()).isEmpty();
    assertThat(reloaded.status()).isEqualTo(MilestoneStatus.COMPLETED);
  }

  @Test
  void findByProjectIdReturnsMatchingMilestonesOnly() {
    JpaMilestoneRepository repository = new JpaMilestoneRepository(jpaRepository);
    UUID projectIdA = UUID.randomUUID();
    UUID projectIdB = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    repository.save(
        new Milestone(
            UUID.randomUUID(),
            projectIdA,
            "MS 1",
            Optional.empty(),
            MilestoneStatus.PLANNED,
            1,
            now,
            now,
            0L));
    repository.save(
        new Milestone(
            UUID.randomUUID(),
            projectIdA,
            "MS 2",
            Optional.empty(),
            MilestoneStatus.PLANNED,
            2,
            now,
            now,
            0L));
    repository.save(
        new Milestone(
            UUID.randomUUID(),
            projectIdB,
            "MS 3",
            Optional.empty(),
            MilestoneStatus.PLANNED,
            1,
            now,
            now,
            0L));
    jpaRepository.flush();

    List<Milestone> milestonesA = repository.findByProjectId(projectIdA);
    assertThat(milestonesA).hasSize(2);

    List<Milestone> milestonesB = repository.findByProjectId(projectIdB);
    assertThat(milestonesB).hasSize(1);
  }

  @Test
  void deleteRemovesMilestone() {
    JpaMilestoneRepository repository = new JpaMilestoneRepository(jpaRepository);
    UUID id = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Milestone milestone =
        repository.save(
            new Milestone(
                id, projectId, "MS", Optional.empty(), MilestoneStatus.PLANNED, 0, now, now, 0L));
    jpaRepository.flush();

    assertThat(repository.findById(id)).isPresent();

    repository.delete(milestone);
    jpaRepository.flush();

    assertThat(repository.findById(id)).isEmpty();
  }
}
