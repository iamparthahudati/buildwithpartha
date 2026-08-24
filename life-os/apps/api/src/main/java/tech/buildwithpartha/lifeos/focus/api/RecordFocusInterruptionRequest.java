package tech.buildwithpartha.lifeos.focus.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/** Optional private distraction note recorded against an active Focus Session. */
public record RecordFocusInterruptionRequest(
    @NotNull @PositiveOrZero Long version, @Size(max = 2000) String note) {}
