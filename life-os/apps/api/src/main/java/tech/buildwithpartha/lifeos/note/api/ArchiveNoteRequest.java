package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.constraints.NotNull;

/** Request DTO for archiving a Note. */
public record ArchiveNoteRequest(@NotNull(message = "version is required") Long version) {}
