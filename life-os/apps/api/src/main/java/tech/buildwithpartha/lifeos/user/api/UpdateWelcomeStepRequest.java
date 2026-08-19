package tech.buildwithpartha.lifeos.user.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record UpdateWelcomeStepRequest(@NotBlank @Size(max = 100) String displayName) {}
