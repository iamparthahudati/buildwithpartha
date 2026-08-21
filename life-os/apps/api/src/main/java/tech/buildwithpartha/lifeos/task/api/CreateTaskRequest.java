package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CreateTaskRequest(
    UUID projectId,
    @NotBlank(message = "Title must not be blank") String title,
    String description,
    String status,
    String priority,
    Instant dueAt,
    Integer estimateMinutes,
    Integer spentMinutes,
    Integer progress,
    LocalDate mitDate,
    Integer position) {}
