package tech.buildwithpartha.lifeos.task.infrastructure;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.test.context.ActiveProfiles;
import tech.buildwithpartha.lifeos.task.domain.Subtask;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ActiveProfiles("test")
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class JpaTaskRepositoryTests {

  @Autowired private TaskJpaRepository taskJpaRepository;
  @Autowired private SubtaskJpaRepository subtaskJpaRepository;
  @Autowired private jakarta.persistence.EntityManager entityManager;

  @Test
  @DisplayName("Saved task and subtasks round-trip through JPA repository")
  void roundTripsTaskAndSubtasks() {
    JpaTaskRepository repository =
        new JpaTaskRepository(taskJpaRepository, subtaskJpaRepository, entityManager);
    UUID id = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-21T02:00:00Z");
    LocalDate mitDate = LocalDate.of(2026, 8, 21);

    Subtask sub1 = new Subtask(UUID.randomUUID(), id, "Subtask 1", false, 0, now, now, 0L);
    Subtask sub2 = new Subtask(UUID.randomUUID(), id, "Subtask 2", true, 1, now, now, 0L);

    Task task =
        new Task(
            id,
            userId,
            Optional.of(projectId),
            "Complete Task Model",
            Optional.of("Description"),
            TaskStatus.IN_PROGRESS,
            TaskPriority.P1,
            Optional.of(now.plusSeconds(86400)),
            120,
            30,
            25,
            Optional.of(mitDate),
            1,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(sub1, sub2),
            0L);

    Task saved = repository.save(task);

    assertThat(saved.id()).isEqualTo(id);
    assertThat(saved.userId()).isEqualTo(userId);
    assertThat(saved.projectId()).contains(projectId);
    assertThat(saved.title()).isEqualTo("Complete Task Model");
    assertThat(saved.description()).contains("Description");
    assertThat(saved.status()).isEqualTo(TaskStatus.IN_PROGRESS);
    assertThat(saved.priority()).isEqualTo(TaskPriority.P1);
    assertThat(saved.dueAt()).contains(now.plusSeconds(86400));
    assertThat(saved.estimateMinutes()).isEqualTo(120);
    assertThat(saved.spentMinutes()).isEqualTo(30);
    assertThat(saved.progress()).isEqualTo(25);
    assertThat(saved.mitDate()).contains(mitDate);
    assertThat(saved.subtasks()).hasSize(2);
    assertThat(saved.subtasks().get(0).title()).isEqualTo("Subtask 1");
    assertThat(saved.subtasks().get(1).completed()).isTrue();

    Optional<Task> reloaded = repository.findByIdAndUserId(id, userId);
    assertThat(reloaded).isPresent();
    assertThat(reloaded.get().subtasks()).hasSize(2);
    assertThat(reloaded.get().subtasks().get(0).position()).isEqualTo(0);
    assertThat(reloaded.get().subtasks().get(1).position()).isEqualTo(1);
  }

  @Test
  @DisplayName("findByUserId, findByProjectId, and findByUserIdAndMitDate query correctly")
  void queryFiltersByUserIdProjectAndMitDate() {
    JpaTaskRepository repository =
        new JpaTaskRepository(taskJpaRepository, subtaskJpaRepository, entityManager);
    UUID userA = UUID.randomUUID();
    UUID userB = UUID.randomUUID();
    UUID projectId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-21T02:00:00Z");
    LocalDate mitDate = LocalDate.of(2026, 8, 21);

    Task t1 =
        new Task(
            UUID.randomUUID(),
            userA,
            Optional.of(projectId),
            "Task A",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            60,
            0,
            0,
            Optional.of(mitDate),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L);

    Task t2 =
        new Task(
            UUID.randomUUID(),
            userA,
            Optional.empty(),
            "Task B",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P3,
            Optional.empty(),
            30,
            0,
            100,
            Optional.empty(),
            1,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L);

    Task t3 =
        new Task(
            UUID.randomUUID(),
            userB,
            Optional.of(projectId),
            "Task C",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            90,
            0,
            0,
            Optional.of(mitDate),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            0L);

    repository.save(t1);
    repository.save(t2);
    repository.save(t3);

    List<Task> userATasks = repository.findByUserId(userA);
    assertThat(userATasks).hasSize(2);

    List<Task> projectTasks = repository.findByProjectId(projectId);
    assertThat(projectTasks).hasSize(2);

    List<Task> mitTasksA = repository.findByUserIdAndMitDate(userA, mitDate);
    assertThat(mitTasksA).hasSize(1);
    assertThat(mitTasksA.get(0).id()).isEqualTo(t1.id());
  }

  @Test
  @DisplayName("clearMitDateForUserAndDate clears MIT designation atomically")
  void clearsMitDateForUserAndDate() {
    JpaTaskRepository repository =
        new JpaTaskRepository(taskJpaRepository, subtaskJpaRepository, entityManager);
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-21T02:00:00Z");
    LocalDate mitDate = LocalDate.of(2026, 8, 21);

    Task task =
        repository.save(
            new Task(
                UUID.randomUUID(),
                userId,
                Optional.empty(),
                "MIT Task",
                Optional.empty(),
                TaskStatus.TO_DO,
                TaskPriority.P1,
                Optional.empty(),
                60,
                0,
                0,
                Optional.of(mitDate),
                0,
                Optional.empty(),
                Optional.empty(),
                now,
                now,
                List.of(),
                0L));

    assertThat(repository.findByUserIdAndMitDate(userId, mitDate)).hasSize(1);

    repository.clearMitDateForUserAndDate(userId, mitDate);

    assertThat(repository.findByUserIdAndMitDate(userId, mitDate)).isEmpty();

    Task reloaded = repository.findById(task.id()).orElseThrow();
    assertThat(reloaded.mitDate()).isEmpty();
  }

  @Test
  @DisplayName("deleteById removes task and cascades subtasks")
  void deleteByIdRemovesTaskAndSubtasks() {
    JpaTaskRepository repository =
        new JpaTaskRepository(taskJpaRepository, subtaskJpaRepository, entityManager);
    UUID taskId = UUID.randomUUID();
    UUID userId = UUID.randomUUID();
    Instant now = Instant.parse("2026-08-21T02:00:00Z");

    Subtask subtask =
        new Subtask(UUID.randomUUID(), taskId, "Subtask to delete", false, 0, now, now, 0L);
    Task task =
        new Task(
            taskId,
            userId,
            Optional.empty(),
            "Task to delete",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P2,
            Optional.empty(),
            30,
            0,
            0,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(subtask),
            0L);

    repository.save(task);
    assertThat(repository.findById(taskId)).isPresent();

    repository.deleteById(taskId);
    assertThat(repository.findById(taskId)).isEmpty();
  }
}
