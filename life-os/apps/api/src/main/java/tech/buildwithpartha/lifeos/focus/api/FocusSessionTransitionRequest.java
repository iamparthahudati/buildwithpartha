package tech.buildwithpartha.lifeos.focus.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

/** Optimistic version required for a Focus Session transition. */
public record FocusSessionTransitionRequest(@NotNull @PositiveOrZero Long version) {}
