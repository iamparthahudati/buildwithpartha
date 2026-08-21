package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Request for one action applied independently to a bounded task selection. */
public record BulkTaskActionRequest(
    @NotEmpty @Size(max = 100) List<@NotNull UUID> taskIds,
    @NotBlank String action,
    String status,
    String priority,
    UUID projectId,
    UUID labelId,
    Instant dueAt) {}
