package tech.buildwithpartha.lifeos.project.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProjectTests {

  @Test
  void successfulProjectCreation() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();
    LocalDate start = LocalDate.of(2026, 8, 20);
    LocalDate end = LocalDate.of(2026, 8, 30);

    Project project =
        new Project(
            id,
            userId,
            "Test Project",
            Optional.of("Description"),
            ProjectStatus.PLANNED,
            ProjectPriority.P2,
            ProjectHealth.ON_TRACK,
            Optional.of("blue"),
            Optional.of("icon"),
            Optional.of(start),
            Optional.of(end),
            Optional.of(120),
            Optional.empty(),
            now,
            now,
            Set.of(UUID.randomUUID()),
            0L);

    assertThat(project.id()).isEqualTo(id);
    assertThat(project.userId()).isEqualTo(userId);
    assertThat(project.name()).isEqualTo("Test Project");
    assertThat(project.description()).contains("Description");
    assertThat(project.status()).isEqualTo(ProjectStatus.PLANNED);
    assertThat(project.priority()).isEqualTo(ProjectPriority.P2);
    assertThat(project.health()).isEqualTo(ProjectHealth.ON_TRACK);
    assertThat(project.color()).contains("blue");
    assertThat(project.icon()).contains("icon");
    assertThat(project.startDate()).contains(start);
    assertThat(project.deadlineDate()).contains(end);
    assertThat(project.estimateMinutes()).contains(120);
    assertThat(project.archivedAt()).isEmpty();
    assertThat(project.createdAt()).isEqualTo(now);
    assertThat(project.updatedAt()).isEqualTo(now);
    assertThat(project.labelIds()).hasSize(1);
    assertThat(project.version()).isZero();
  }

  @Test
  void rejectsDeadlineBeforeStartDate() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();
    LocalDate start = LocalDate.of(2026, 8, 20);
    LocalDate end = LocalDate.of(2026, 8, 19);

    assertThatThrownBy(
            () ->
                new Project(
                    id,
                    userId,
                    "Test Project",
                    Optional.empty(),
                    ProjectStatus.PLANNED,
                    ProjectPriority.P2,
                    ProjectHealth.NOT_SET,
                    Optional.empty(),
                    Optional.empty(),
                    Optional.of(start),
                    Optional.of(end),
                    Optional.empty(),
                    Optional.empty(),
                    now,
                    now,
                    Set.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Deadline date cannot precede start date");
  }

  @Test
  void rejectsNegativeEstimateMinutes() {
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.now();

    assertThatThrownBy(
            () ->
                new Project(
                    id,
                    userId,
                    "Test Project",
                    Optional.empty(),
                    ProjectStatus.PLANNED,
                    ProjectPriority.P2,
                    ProjectHealth.NOT_SET,
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.empty(),
                    Optional.of(-1),
                    Optional.empty(),
                    now,
                    now,
                    Set.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Estimate minutes must not be negative");
  }

  @Test
  void milestoneSuccessfulCreation() {
    UUID id = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.now();
    LocalDate date = LocalDate.of(2026, 8, 25);

    Milestone milestone =
        new Milestone(
            id,
            projectId,
            "Milestone 1",
            Optional.of(date),
            MilestoneStatus.PLANNED,
            5,
            now,
            now,
            0L);

    assertThat(milestone.id()).isEqualTo(id);
    assertThat(milestone.projectId()).isEqualTo(projectId);
    assertThat(milestone.title()).isEqualTo("Milestone 1");
    assertThat(milestone.date()).contains(date);
    assertThat(milestone.status()).isEqualTo(MilestoneStatus.PLANNED);
    assertThat(milestone.ordering()).isEqualTo(5);
    assertThat(milestone.createdAt()).isEqualTo(now);
    assertThat(milestone.updatedAt()).isEqualTo(now);
    assertThat(milestone.version()).isZero();
  }
}
