package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToTaskCommand;

public record ConvertToTaskRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 500, message = "TOO_LONG") String title,
    Optional<String> description,
    Optional<UUID> projectId,
    Optional<Instant> dueAt,
    @NotBlank(message = "REQUIRED") String priority,
    Set<UUID> labelIds,
    long version) {

  public ConvertToTaskRequest {
    if (description == null) {
      description = Optional.empty();
    }
    if (projectId == null) {
      projectId = Optional.empty();
    }
    if (dueAt == null) {
      dueAt = Optional.empty();
    }
    if (labelIds == null) {
      labelIds = Set.of();
    }
  }

  public ConvertToTaskCommand toCommand() {
    return new ConvertToTaskCommand(title, description, projectId, dueAt, priority, labelIds);
  }
}
