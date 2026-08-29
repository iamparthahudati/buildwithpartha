package tech.buildwithpartha.lifeos.note.api;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import tech.buildwithpartha.lifeos.note.domain.NoteLinkTargetType;

/** Request payload representing a Note link. */
public record NoteLinkRequest(
    @NotNull(message = "targetType must not be null") NoteLinkTargetType targetType,
    @NotNull(message = "targetId must not be null") UUID targetId) {}
