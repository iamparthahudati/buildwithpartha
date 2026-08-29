package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for restoring a Note. */
public record RestoreNoteRequest(@NotNull(message = "version is required") Long version) {}
