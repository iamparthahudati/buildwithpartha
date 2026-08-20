package tech.buildwithpartha.lifeos.project.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.project.domain.Milestone;
import tech.buildwithpartha.lifeos.project.domain.MilestoneStatus;

class JpaMilestoneRepositoryTests {

  private MilestoneJpaRepository jpaRepository;
  private JpaMilestoneRepository repository;

  @BeforeEach
  void setUp() {
    jpaRepository = mock(MilestoneJpaRepository.class);
    repository = new JpaMilestoneRepository(jpaRepository);
  }

  @Test
  void findByIdMapsExistingMilestone() {
    UUID id = UUID.randomUUID();
    MilestoneEntity entity =
        new MilestoneEntity(
            id,
            UUID.randomUUID(),
            "Milestone A",
            LocalDate.now(),
            MilestoneStatus.PLANNED,
            1,
            Instant.now(),
            Instant.now(),
            1L);

    when(jpaRepository.findById(id)).thenReturn(Optional.of(entity));

    Optional<Milestone> result = repository.findById(id);

    assertThat(result).isPresent();
    Milestone domain = result.get();
    assertThat(domain.id()).isEqualTo(id);
    assertThat(domain.title()).isEqualTo("Milestone A");
    assertThat(domain.date()).contains(entity.getDate());
    assertThat(domain.status()).isEqualTo(MilestoneStatus.PLANNED);
    assertThat(domain.ordering()).isEqualTo(1);
    assertThat(domain.version()).isEqualTo(1L);
  }

  @Test
  void findByIdMapsMilestoneWithNullDate() {
    UUID id = UUID.randomUUID();
    MilestoneEntity entity =
        new MilestoneEntity(
            id,
            UUID.randomUUID(),
            "Milestone A",
            null,
            MilestoneStatus.COMPLETED,
            2,
            Instant.now(),
            Instant.now(),
            0L);

    when(jpaRepository.findById(id)).thenReturn(Optional.of(entity));

    Optional<Milestone> result = repository.findById(id);

    assertThat(result).isPresent();
    Milestone domain = result.get();
    assertThat(domain.date()).isEmpty();
    assertThat(domain.status()).isEqualTo(MilestoneStatus.COMPLETED);
  }

  @Test
  void findByProjectIdReturnsList() {
    UUID projectId = UUID.randomUUID();
    MilestoneEntity entity =
        new MilestoneEntity(
            UUID.randomUUID(),
            projectId,
            "Milestone",
            null,
            MilestoneStatus.PLANNED,
            0,
            Instant.now(),
            Instant.now(),
            0L);

    when(jpaRepository.findByProjectId(projectId)).thenReturn(List.of(entity));

    List<Milestone> results = repository.findByProjectId(projectId);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).projectId()).isEqualTo(projectId);
  }

  @Test
  void saveMapsAndPersistsMilestone() {
    Milestone domain =
        new Milestone(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Milestone",
            Optional.of(LocalDate.now()),
            MilestoneStatus.PLANNED,
            3,
            Instant.now(),
            Instant.now(),
            0L);

    MilestoneEntity entity = JpaMilestoneRepository.toEntity(domain);
    when(jpaRepository.save(any(MilestoneEntity.class))).thenReturn(entity);

    Milestone saved = repository.save(domain);

    assertThat(saved.title()).isEqualTo("Milestone");
    verify(jpaRepository).save(any(MilestoneEntity.class));
  }

  @Test
  void deleteRemovesMilestone() {
    Milestone domain =
        new Milestone(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Milestone",
            Optional.empty(),
            MilestoneStatus.PLANNED,
            0,
            Instant.now(),
            Instant.now(),
            0L);

    repository.delete(domain);

    verify(jpaRepository).delete(any(MilestoneEntity.class));
  }
}
