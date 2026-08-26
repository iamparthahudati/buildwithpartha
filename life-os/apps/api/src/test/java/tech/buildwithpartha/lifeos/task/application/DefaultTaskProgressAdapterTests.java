package tech.buildwithpartha.lifeos.task.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.buildwithpartha.lifeos.common.progress.TaskProgressPort;
import tech.buildwithpartha.lifeos.task.domain.Task;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskRepository;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

@ExtendWith(MockitoExtension.class)
class DefaultTaskProgressAdapterTests {

  @Mock private TaskRepository taskRepository;

  private DefaultTaskProgressAdapter adapter;
  private UUID userId;

  @BeforeEach
  void setUp() {
    adapter = new DefaultTaskProgressAdapter(taskRepository);
    userId = UUID.randomUUID();
  }

  @Test
  void aggregatesTaskProgressWithFilteringAndBranchCoverage() {
    Instant now = Instant.parse("2026-08-26T10:00:00Z");
    Instant rangeStart = Instant.parse("2026-08-20T00:00:00Z");
    Instant rangeEnd = Instant.parse("2026-08-27T00:00:00Z");

    UUID projId = UUID.randomUUID();
    UUID labelId = UUID.randomUUID();

    // 1. Completed task within range & matching project + label (no dueAt)
    Task task1 =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.of(projId),
            "Task 1",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P1,
            Optional.empty(),
            60,
            60,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(labelId),
            0L);

    // 2. Blocked task with due date
    Task task2 =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.of(projId),
            "Task 2",
            Optional.empty(),
            TaskStatus.BLOCKED,
            TaskPriority.P2,
            Optional.of(now.plusSeconds(3600)),
            30,
            0,
            0,
            Optional.empty(),
            1,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(labelId),
            0L);

    // 3. Overdue P1 task
    Task task3 =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.of(projId),
            "Task 3",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.of(now.minusSeconds(7200)),
            30,
            0,
            0,
            Optional.empty(),
            1,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(labelId),
            0L);

    // 4. Deleted task (should be filtered out)
    Task task4 =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.of(projId),
            "Task 4",
            Optional.empty(),
            TaskStatus.TO_DO,
            TaskPriority.P1,
            Optional.empty(),
            30,
            0,
            0,
            Optional.empty(),
            1,
            Optional.empty(),
            Optional.of(now),
            now,
            now,
            List.of(),
            Set.of(labelId),
            0L);

    when(taskRepository.findByUserId(userId)).thenReturn(List.of(task1, task2, task3, task4));

    TaskProgressPort.TaskProgressData result =
        adapter.getTaskProgress(userId, rangeStart, rangeEnd, now, projId, labelId);

    assertEquals(3, result.totalCount());
    assertEquals(1, result.completedCount());
    assertEquals(2, result.dueCount());
    assertEquals(1, result.overdueCount());
    assertEquals(1, result.highPriorityCount());
    assertEquals(1, result.blockedCount());
  }

  @Test
  void respectsMismatchingProjectAndLabelFilters() {
    Instant now = Instant.parse("2026-08-26T10:00:00Z");
    Instant rangeStart = Instant.parse("2026-08-20T00:00:00Z");
    Instant rangeEnd = Instant.parse("2026-08-27T00:00:00Z");

    UUID projId1 = UUID.randomUUID();
    UUID projId2 = UUID.randomUUID();
    UUID labelId1 = UUID.randomUUID();
    UUID labelId2 = UUID.randomUUID();

    Task task1 =
        new Task(
            UUID.randomUUID(),
            userId,
            Optional.of(projId1),
            "Task 1",
            Optional.empty(),
            TaskStatus.DONE,
            TaskPriority.P1,
            Optional.empty(),
            60,
            60,
            100,
            Optional.empty(),
            0,
            Optional.empty(),
            Optional.empty(),
            now,
            now,
            List.of(),
            Set.of(labelId1),
            0L);

    when(taskRepository.findByUserId(userId)).thenReturn(List.of(task1));

    TaskProgressPort.TaskProgressData resultProjMismatch =
        adapter.getTaskProgress(userId, rangeStart, rangeEnd, now, projId2, labelId1);
    assertEquals(0, resultProjMismatch.totalCount());

    TaskProgressPort.TaskProgressData resultLabelMismatch =
        adapter.getTaskProgress(userId, rangeStart, rangeEnd, now, projId1, labelId2);
    assertEquals(0, resultLabelMismatch.totalCount());
  }
}
