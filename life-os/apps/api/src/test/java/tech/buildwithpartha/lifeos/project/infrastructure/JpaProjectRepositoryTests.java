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
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;

class JpaProjectRepositoryTests {

  private ProjectJpaRepository jpaRepository;
  private JpaProjectRepository repository;

  @BeforeEach
  void setUp() {
    jpaRepository = mock(ProjectJpaRepository.class);
    repository = new JpaProjectRepository(jpaRepository);
  }

  @Test
  void findByIdMapsExistingProject() {
    UUID id = UUID.randomUUID();
    ProjectEntity entity =
        new ProjectEntity(
            id,
            UUID.randomUUID(),
            "Project A",
            "Desc",
            ProjectStatus.ACTIVE,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            "green",
            "icon",
            LocalDate.now(),
            LocalDate.now().plusDays(5),
            60,
            null,
            Instant.now(),
            Instant.now(),
            Set.of(UUID.randomUUID()),
            1L);

    when(jpaRepository.findById(id)).thenReturn(Optional.of(entity));

    Optional<Project> result = repository.findById(id);

    assertThat(result).isPresent();
    Project domain = result.get();
    assertThat(domain.id()).isEqualTo(id);
    assertThat(domain.name()).isEqualTo("Project A");
    assertThat(domain.description()).contains("Desc");
    assertThat(domain.status()).isEqualTo(ProjectStatus.ACTIVE);
    assertThat(domain.priority()).isEqualTo(ProjectPriority.P1);
    assertThat(domain.health()).isEqualTo(ProjectHealth.ON_TRACK);
    assertThat(domain.color()).contains("green");
    assertThat(domain.icon()).contains("icon");
    assertThat(domain.startDate()).isPresent();
    assertThat(domain.deadlineDate()).isPresent();
    assertThat(domain.estimateMinutes()).contains(60);
    assertThat(domain.archivedAt()).isEmpty();
    assertThat(domain.labelIds()).hasSize(1);
    assertThat(domain.version()).isEqualTo(1L);
  }

  @Test
  void findByIdMapsEmptyProjectWithNullFields() {
    UUID id = UUID.randomUUID();
    ProjectEntity entity =
        new ProjectEntity(
            id,
            UUID.randomUUID(),
            "Project A",
            null,
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            null,
            null,
            null,
            null,
            null,
            Instant.now(),
            Instant.now(),
            Instant.now(),
            null,
            0L);

    when(jpaRepository.findById(id)).thenReturn(Optional.of(entity));

    Optional<Project> result = repository.findById(id);

    assertThat(result).isPresent();
    Project domain = result.get();
    assertThat(domain.description()).isEmpty();
    assertThat(domain.color()).isEmpty();
    assertThat(domain.icon()).isEmpty();
    assertThat(domain.startDate()).isEmpty();
    assertThat(domain.deadlineDate()).isEmpty();
    assertThat(domain.estimateMinutes()).isEmpty();
    assertThat(domain.archivedAt()).isPresent();
    assertThat(domain.labelIds()).isEmpty();
  }

  @Test
  void findByUserIdReturnsMappedList() {
    UUID userId = UUID.randomUUID();
    ProjectEntity entity =
        new ProjectEntity(
            UUID.randomUUID(),
            userId,
            "Project A",
            null,
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            null,
            null,
            null,
            null,
            null,
            null,
            Instant.now(),
            Instant.now(),
            null,
            0L);

    when(jpaRepository.findByUserId(userId)).thenReturn(List.of(entity));

    List<Project> results = repository.findByUserId(userId);

    assertThat(results).hasSize(1);
    assertThat(results.get(0).userId()).isEqualTo(userId);
  }

  @Test
  void saveMapsAndPersistsProject() {
    Project domain =
        new Project(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Project A",
            Optional.of("Desc"),
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            Set.of(),
            0L);

    ProjectEntity entity = JpaProjectRepository.toEntity(domain);
    when(jpaRepository.save(any(ProjectEntity.class))).thenReturn(entity);

    Project saved = repository.save(domain);

    assertThat(saved.name()).isEqualTo("Project A");
    verify(jpaRepository).save(any(ProjectEntity.class));
  }

  @Test
  void deleteRemovesProject() {
    Project domain =
        new Project(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "Project A",
            Optional.empty(),
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Instant.now(),
            Instant.now(),
            Set.of(),
            0L);

    repository.delete(domain);

    verify(jpaRepository).delete(any(ProjectEntity.class));
  }
}
