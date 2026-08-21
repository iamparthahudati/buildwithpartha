package tech.buildwithpartha.lifeos.task.api;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public record SetMitRequest(@NotNull(message = "Local date must be specified") LocalDate date) {}
