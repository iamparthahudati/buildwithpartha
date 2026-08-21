package tech.buildwithpartha.lifeos.task.application;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;
import tech.buildwithpartha.lifeos.task.domain.TaskPriority;
import tech.buildwithpartha.lifeos.task.domain.TaskStatus;

public record CreateTaskCommand(
    Optional<UUID> projectId,
    String title,
    Optional<String> description,
    TaskStatus status,
    TaskPriority priority,
    Optional<Instant> dueAt,
    int estimateMinutes,
    int spentMinutes,
    int progress,
    Optional<LocalDate> mitDate,
    int position) {}
