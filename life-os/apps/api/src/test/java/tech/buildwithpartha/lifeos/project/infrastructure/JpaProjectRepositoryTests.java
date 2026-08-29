package tech.buildwithpartha.lifeos.project.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.project.domain.Project;
import tech.buildwithpartha.lifeos.project.domain.ProjectHealth;
import tech.buildwithpartha.lifeos.project.domain.ProjectPriority;
import tech.buildwithpartha.lifeos.project.domain.ProjectQuery;
import tech.buildwithpartha.lifeos.project.domain.ProjectQueryResult;
import tech.buildwithpartha.lifeos.project.domain.ProjectStatus;
import tech.buildwithpartha.lifeos.project.domain.ProjectSummaryCounts;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaProjectRepositoryTests {

  @Autowired private ProjectJpaRepository jpaRepository;
  @Autowired private EntityManager entityManager;

  @Test
  void savedProjectRoundTripsThroughTheJpaEntity() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");
    LocalDate start = LocalDate.of(2026, 8, 20);
    LocalDate end = LocalDate.of(2026, 8, 30);
    UUID labelId = UUID.randomUUID();

    Project project =
        new Project(
            id,
            userId,
            "Test Project",
            Optional.of("Description"),
            ProjectStatus.PLANNED,
            ProjectPriority.P1,
            ProjectHealth.ON_TRACK,
            Optional.of("blue"),
            Optional.of("icon"),
            Optional.empty(),
            Optional.of(start),
            Optional.of(end),
            Optional.of(120),
            Optional.empty(),
            now,
            now,
            Set.of(labelId),
            0L);

    Project saved = repository.save(project);
    jpaRepository.flush();

    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.name()).isEqualTo("Test Project");
    assertThat(saved.description()).contains("Description");
    assertThat(saved.status()).isEqualTo(ProjectStatus.PLANNED);
    assertThat(saved.priority()).isEqualTo(ProjectPriority.P1);
    assertThat(saved.health()).isEqualTo(ProjectHealth.ON_TRACK);
    assertThat(saved.color()).contains("blue");
    assertThat(saved.icon()).contains("icon");
    assertThat(saved.startDate()).contains(start);
    assertThat(saved.deadlineDate()).contains(end);
    assertThat(saved.estimateMinutes()).contains(120);
    assertThat(saved.archivedAt()).isEmpty();
    assertThat(saved.createdAt()).isEqualTo(now);
    assertThat(saved.updatedAt()).isEqualTo(now);
    assertThat(saved.labelIds()).containsExactly(labelId);
    assertThat(saved.version()).isEqualTo(1L);

    Project reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.name()).isEqualTo("Test Project");
    assertThat(reloaded.labelIds()).containsExactly(labelId);
    assertThat(reloaded.version()).isEqualTo(1L);
  }

  @Test
  void findByIdMapsEmptyProjectWithNullFields() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Project project =
        new Project(
            id,
            userId,
            "Minimal Project",
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
            Optional.of(now),
            now,
            now,
            Set.of(),
            0L);

    repository.save(project);
    jpaRepository.flush();

    Project reloaded = repository.findById(id).orElseThrow();
    assertThat(reloaded.description()).isEmpty();
    assertThat(reloaded.color()).isEmpty();
    assertThat(reloaded.icon()).isEmpty();
    assertThat(reloaded.startDate()).isEmpty();
    assertThat(reloaded.deadlineDate()).isEmpty();
    assertThat(reloaded.estimateMinutes()).isEmpty();
    assertThat(reloaded.archivedAt()).contains(now);
    assertThat(reloaded.labelIds()).isEmpty();
  }

  @Test
  void findByUserIdReturnsMatchingProjectsOnly() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID userA = UUID.randomUUID();
    UUID userB = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    repository.save(
        new Project(
            UUID.randomUUID(),
            userA,
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
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    repository.save(
        new Project(
            UUID.randomUUID(),
            userA,
            "Project B",
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
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    repository.save(
        new Project(
            UUID.randomUUID(),
            userB,
            "Project C",
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
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    jpaRepository.flush();

    List<Project> projectsA = repository.findByUserId(userA);
    assertThat(projectsA).hasSize(2);

    List<Project> projectsB = repository.findByUserId(userB);
    assertThat(projectsB).hasSize(1);
  }

  @Test
  void deleteRemovesProject() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    Project project =
        repository.save(
            new Project(
                id,
                userId,
                "Project",
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
                Optional.empty(),
                now,
                now,
                Set.of(),
                0L));
    jpaRepository.flush();

    assertThat(repository.findById(id)).isPresent();

    repository.delete(project);
    jpaRepository.flush();

    assertThat(repository.findById(id)).isEmpty();
  }

  @Test
  void queryFiltersAndOrdersSuccessfully() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");
    UUID labelId = UUID.randomUUID();

    Project p1 =
        repository.save(
            new Project(
                UUID.randomUUID(),
                userId,
                "Alpha Project",
                Optional.of("Special project"),
                ProjectStatus.ACTIVE,
                ProjectPriority.P1,
                ProjectHealth.ON_TRACK,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.of(LocalDate.of(2026, 8, 25)),
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                Set.of(labelId),
                0L));

    Project p2 =
        repository.save(
            new Project(
                UUID.randomUUID(),
                userId,
                "Beta Project",
                Optional.of("Another desc"),
                ProjectStatus.PLANNED,
                ProjectPriority.P2,
                ProjectHealth.OFF_TRACK,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.of(LocalDate.of(2026, 8, 28)),
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                Set.of(),
                0L));

    Project p3 =
        repository.save(
            new Project(
                UUID.randomUUID(),
                userId,
                "Gamma Project (Archived)",
                Optional.empty(),
                ProjectStatus.COMPLETED,
                ProjectPriority.P2,
                ProjectHealth.NOT_SET,
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.empty(),
                Optional.of(LocalDate.of(2026, 8, 30)),
                Optional.empty(),
                Optional.of(now),
                now,
                now,
                Set.of(),
                0L));

    jpaRepository.flush();

    // 1. Query by text search
    ProjectQuery qText =
        new ProjectQuery(
            userId, "alpha", Set.of(), Set.of(), Set.of(), Set.of(), null, null, null, 0, 10,
            "name", "asc");
    ProjectQueryResult resText = repository.query(qText);
    assertThat(resText.projects()).hasSize(1);
    assertThat(resText.projects().get(0).id()).isEqualTo(p1.id());
    assertThat(resText.totalItems()).isEqualTo(1);

    // 2. Query status, priority, health filters
    ProjectQuery qStatus =
        new ProjectQuery(
            userId,
            null,
            Set.of(ProjectStatus.PLANNED),
            Set.of(ProjectPriority.P2),
            Set.of(ProjectHealth.OFF_TRACK),
            Set.of(),
            null,
            null,
            null,
            0,
            10,
            "name",
            "asc");
    ProjectQueryResult resStatus = repository.query(qStatus);
    assertThat(resStatus.projects()).hasSize(1);
    assertThat(resStatus.projects().get(0).id()).isEqualTo(p2.id());

    // 3. Query by labels
    ProjectQuery qLabels =
        new ProjectQuery(
            userId,
            null,
            Set.of(),
            Set.of(),
            Set.of(),
            Set.of(labelId),
            null,
            null,
            null,
            0,
            10,
            "name",
            "asc");
    ProjectQueryResult resLabels = repository.query(qLabels);
    assertThat(resLabels.projects()).hasSize(1);
    assertThat(resLabels.projects().get(0).id()).isEqualTo(p1.id());

    // 4. Query deadline range
    ProjectQuery qDates =
        new ProjectQuery(
            userId,
            null,
            Set.of(),
            Set.of(),
            Set.of(),
            Set.of(),
            LocalDate.of(2026, 8, 29),
            LocalDate.of(2026, 8, 26),
            null,
            0,
            10,
            "name",
            "asc");
    ProjectQueryResult resDates = repository.query(qDates);
    assertThat(resDates.projects()).hasSize(1);
    assertThat(resDates.projects().get(0).id()).isEqualTo(p2.id());

    // 5. Query archived vs active
    ProjectQuery qArchived =
        new ProjectQuery(
            userId, null, Set.of(), Set.of(), Set.of(), Set.of(), null, null, true, 0, 10, "name",
            "asc");
    ProjectQueryResult resArchived = repository.query(qArchived);
    assertThat(resArchived.projects()).hasSize(1);
    assertThat(resArchived.projects().get(0).id()).isEqualTo(p3.id());

    ProjectQuery qActive =
        new ProjectQuery(
            userId, null, Set.of(), Set.of(), Set.of(), Set.of(), null, null, false, 0, 10, "name",
            "asc");
    ProjectQueryResult resActive = repository.query(qActive);
    assertThat(resActive.projects()).hasSize(2);
  }

  @Test
  void getSummaryCountsAggregatesCorrectly() {
    JpaProjectRepository repository = new JpaProjectRepository(jpaRepository, entityManager);
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-20T10:00:00Z");

    repository.save(
        new Project(
            UUID.randomUUID(),
            userId,
            "P1",
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    repository.save(
        new Project(
            UUID.randomUUID(),
            userId,
            "P2",
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P2,
            ProjectHealth.OFF_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    repository.save(
        new Project(
            UUID.randomUUID(),
            userId,
            "P3",
            Optional.empty(),
            ProjectStatus.COMPLETED,
            ProjectPriority.P2,
            ProjectHealth.NOT_SET,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            Set.of(),
            0L));
    repository.save(
        new Project(
            UUID.randomUUID(),
            userId,
            "P4 (Archived)",
            Optional.empty(),
            ProjectStatus.ACTIVE,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.empty(),
            Optional.of(now),
            now,
            now,
            Set.of(),
            0L));
    jpaRepository.flush();

    ProjectSummaryCounts counts = repository.getSummaryCounts(userId);
    assertThat(counts.total()).isEqualTo(3); // P1, P2, P3
    assertThat(counts.active()).isEqualTo(2); // P1, P2
    assertThat(counts.completed()).isEqualTo(1); // P3
    assertThat(counts.onHold()).isZero();
    assertThat(counts.atRisk()).isEqualTo(1); // P2 (OFF_TRACK)
  }
}
