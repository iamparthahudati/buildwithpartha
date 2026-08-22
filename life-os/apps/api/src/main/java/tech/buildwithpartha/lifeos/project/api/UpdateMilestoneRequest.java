package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

/** Request DTO for updating a Milestone. */
public record UpdateMilestoneRequest(
    @NotBlank @Size(max = 255) String title,
    LocalDate date,
    @NotBlank String status,
    @NotNull @Min(0) Integer ordering,
    @NotNull Long version) {}
