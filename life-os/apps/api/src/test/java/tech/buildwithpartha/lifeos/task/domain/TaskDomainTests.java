package tech.buildwithpartha.lifeos.task.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tech.buildwithpartha.lifeos.project.domain.ProjectTask;
import tech.buildwithpartha.lifeos.project.domain.ProjectTaskStatus;

class TaskDomainTests {

  private static final UUID USER_ID = UUID.randomUUID();
  private static final UUID PROJECT_ID = UUID.randomUUID();
  private static final Instant NOW = Instant.parse("2026-08-21T02:00:00Z");

  @Test
  @DisplayName("Task constructor validates non-blank title and non-negative bounds")
  void validatesTaskInvariants() {
    UUID id = UUID.randomUUID();

    assertThatThrownBy(
            () ->
                new Task(
                    id,
                    USER_ID,
                    Optional.empty(),
                    "   ",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    0,
                    0,
                    Optional.empty(),
                    0,
                    Optional.empty(),
                    Optional.empty(),
                    NOW,
                    NOW,
                    List.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("title must not be blank");

    assertThatThrownBy(
            () ->
                new Task(
                    id,
                    USER_ID,
                    Optional.empty(),
                    "Valid Title",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    -10,
                    0,
                    0,
                    Optional.empty(),
                    0,
                    Optional.empty(),
                    Optional.empty(),
                    NOW,
                    NOW,
                    List.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Estimate minutes must not be negative");

    assertThatThrownBy(
            () ->
                new Task(
                    id,
                    USER_ID,
                    Optional.empty(),
                    "Valid Title",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    0,
                    150,
                    Optional.empty(),
                    0,
                    Optional.empty(),
                    Optional.empty(),
                    NOW,
                    NOW,
                    List.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("Progress must be between 0 and 100");
  }

  @Test
  @DisplayName("Task supports projectless tasks and project-linked tasks")
  void supportsProjectlessAndLinkedTasks() {
    Task projectless = TaskDomainFixture.createSampleTask(USER_ID, Optional.empty());
    assertThat(projectless.projectId()).isEmpty();

    Task projectLinked = TaskDomainFixture.createSampleTask(USER_ID, Optional.of(PROJECT_ID));
    assertThat(projectLinked.projectId()).contains(PROJECT_ID);
  }

  @Test
  @DisplayName(
      "isOverdue correctly evaluates due timestamp against terminal, archived, and deleted states")
  void evaluatesOverdueState() {
    Instant pastDue = NOW.minusSeconds(3600);
    Task activeOverdue =
        new Task(
            UUID.randomUUID(),
            USER_ID,
            Optional.empty(),
            "Overdue Task",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.of(pastDue),
            60,
            0,
            0,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            NOW,
            NOW,
            List.of(),
            0L);

    assertThat(activeOverdue.isOverdue(NOW)).isTrue();

    Task doneOverdue =
        activeOverdue.withUpdates(
            null, null, null, TaskStatus.DONE, null, null, null, null, null, null, null, NOW);
    assertThat(doneOverdue.isOverdue(NOW)).isFalse();

    Task archivedOverdue = activeOverdue.archive(NOW, NOW);
    assertThat(archivedOverdue.isOverdue(NOW)).isFalse();

    Task deletedOverdue = activeOverdue.softDelete(NOW, NOW);
    assertThat(deletedOverdue.isOverdue(NOW)).isFalse();
  }

  @Test
  @DisplayName("Subtask record enforces title and supports completion toggle")
  void validatesSubtaskInvariants() {
    UUID taskId = UUID.randomUUID();
    Subtask subtask =
        new Subtask(UUID.randomUUID(), taskId, "Subtask Title", false, 0, NOW, NOW, 0L);

    assertThat(subtask.completed()).isFalse();
    Subtask completedSubtask = subtask.withCompleted(true, NOW.plusSeconds(10));
    assertThat(completedSubtask.completed()).isTrue();

    assertThatThrownBy(() -> new Subtask(UUID.randomUUID(), taskId, "", false, 0, NOW, NOW, 0L))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("title must not be blank");
  }

  @Test
  @DisplayName("ProjectTask contract reconciliation maps TaskStatus to ProjectTaskStatus correctly")
  void reconcilesProjectTaskContract() {
    Task task = TaskDomainFixture.createSampleTask(USER_ID, Optional.of(PROJECT_ID));

    ProjectTask projectTask =
        ProjectTask.fromStatusName(
            task.id(),
            task.status().name(),
            task.estimateMinutes(),
            task.dueAt(),
            task.isArchived());

    assertThat(projectTask.id()).isEqualTo(task.id());
    assertThat(projectTask.status()).isEqualTo(ProjectTaskStatus.TO_DO);
    assertThat(projectTask.estimateMinutes()).isEqualTo(60);
    assertThat(projectTask.archived()).isFalse();
  }

  @Test
  @DisplayName("Task validates spentMinutes and supports duplicate/restore")
  void validatesSpentMinutesAndDuplicate() {
    UUID id = UUID.randomUUID();

    assertThatThrownBy(
            () ->
                new Task(
                    id,
                    USER_ID,
                    Optional.empty(),
                    "Valid Title",
                    Optional.empty(),
                    TaskStatus.TO_DO,
                    TaskPriority.P2,
                    Optional.empty(),
                    0,
                    -10,
                    0,
                    Optional.empty(),
                    0,
                    Optional.empty(),
                    Optional.empty(),
                    NOW,
                    NOW,
                    List.of(),
                    0L))
        .isInstanceOf(IllegalArgumentException.class);

    Task sample = TaskDomainFixture.createSampleTask(USER_ID, Optional.of(PROJECT_ID));
    Task duplicated = sample.duplicate(UUID.randomUUID(), "Copy of " + sample.title(), NOW);
    assertThat(duplicated.id()).isNotEqualTo(sample.id());
    assertThat(duplicated.title()).isEqualTo("Copy of " + sample.title());

    Task archived = sample.archive(NOW, NOW);
    Task restored = archived.restore(NOW);
    assertThat(restored.isArchived()).isFalse();
  }
}
