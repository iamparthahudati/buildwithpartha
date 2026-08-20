package tech.buildwithpartha.lifeos.task.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public final class TaskDomainFixture {

  private TaskDomainFixture() {}

  public static Task createSampleTask(UUID userId, Optional<UUID> projectId) {
    Instant now = Instant.parse("2026-08-21T00:00:00Z");
    UUID taskId = UUID.randomUUID();
    Subtask subtask = new Subtask(UUID.randomUUID(), taskId, "Subtask 1", false, 0, now, now, 0L);

    return new Task(
        taskId,
        userId,
        projectId,
        "Sample Task",
        Optional.of("Sample Description"),
        TaskStatus.TO_DO,
        TaskPriority.P2,
        Optional.of(now.plusSeconds(86400)),
        60,
        0,
        0,
        Optional.of(LocalDate.of(2026, 8, 21)),
        0,
        Optional.empty(),
        Optional.empty(),
        now,
        now,
        List.of(subtask),
        0L);
  }
}
