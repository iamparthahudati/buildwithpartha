package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record UpdateTaskRequest(
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
    Integer position,
    @NotNull(message = "Version must be specified") Long version) {}
