package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

/** Request DTO for creating a Project. */
public record CreateProjectRequest(
    @NotBlank @Size(max = 255) String name,
    @Size(max = 2000) String description,
    String status,
    String priority,
    String health,
    @Size(max = 50) String color,
    @Size(max = 50) String icon,
    @Size(max = 2048) @Pattern(
            regexp = "^(https://|/).*",
            message = "must be an https URL or a root-relative path")
        String coverImageUrl,
    LocalDate startDate,
    LocalDate deadlineDate,
    @Min(0) Integer estimateMinutes,
    Set<UUID> labelIds) {}
