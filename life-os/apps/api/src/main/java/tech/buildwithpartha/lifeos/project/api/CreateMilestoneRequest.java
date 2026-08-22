package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Request DTO for creating a Milestone. */
public record CreateMilestoneRequest(
    @NotBlank @Size(max = 255) String title,
    LocalDate date,
    String status,
    @Min(0) Integer ordering) {}
