package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for pinning a Note. */
public record PinNoteRequest(@NotNull(message = "version is required") Long version) {}
