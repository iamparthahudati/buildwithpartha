package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/** Request DTO for updating a Project. */
public record UpdateProjectRequest(
    @NotBlank @Size(max = 255) String name,
    @Size(max = 2000) String description,
    String status,
    String priority,
    String health,
    @Size(max = 50) String color,
    @Size(max = 50) String icon,
    LocalDate startDate,
    LocalDate deadlineDate,
    @Min(0) Integer estimateMinutes,
    Set<UUID> labelIds,
    @NotNull Long version) {}
