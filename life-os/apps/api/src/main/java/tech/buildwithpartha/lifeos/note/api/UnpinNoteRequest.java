package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for unpinning a Note. */
public record UnpinNoteRequest(@NotNull(message = "version is required") Long version) {}
