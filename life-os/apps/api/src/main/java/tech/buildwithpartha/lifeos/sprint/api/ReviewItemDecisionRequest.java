package tech.buildwithpartha.lifeos.sprint.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;

public record ReviewItemDecisionRequest(
    @NotBlank String itemType,
    @NotNull UUID itemId,
    @NotBlank String action,
    LocalDate targetDate,
    String notes) {}
