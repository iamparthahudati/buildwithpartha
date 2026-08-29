package tech.buildwithpartha.lifeos.common.braindump;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public record ConvertToTaskCommand(
    String title,
    Optional<String> description,
    Optional<UUID> projectId,
    Optional<Instant> dueAt,
    String priority,
    Set<UUID> labelIds
) {}
