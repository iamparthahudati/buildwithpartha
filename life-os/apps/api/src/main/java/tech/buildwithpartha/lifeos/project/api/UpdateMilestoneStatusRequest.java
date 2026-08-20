package tech.buildwithpartha.lifeos.project.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Request DTO for updating a Milestone status. */
public record UpdateMilestoneStatusRequest(@NotBlank String status, @NotNull Long version) {}
