package tech.buildwithpartha.lifeos.user.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateUserProfileRequest(
    @NotBlank @Size(max = 100) String displayName,
    @NotBlank @Size(max = 64) String timeZone,
    @NotBlank @Size(max = 16) String locale,
    @Min(1) @Max(7) int weekStart) {}
