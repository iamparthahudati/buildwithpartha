package tech.buildwithpartha.lifeos.goal.api;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.Instant;

/** Request DTO for recording a Goal check-in. */
public record AddCheckInRequest(
    @NotNull(message = "value is required") BigDecimal value, String note, Instant recordedAt) {}
