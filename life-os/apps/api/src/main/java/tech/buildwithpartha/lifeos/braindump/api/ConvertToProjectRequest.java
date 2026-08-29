package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToProjectCommand;

public record ConvertToProjectRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 500, message = "TOO_LONG") String name,
    Optional<String> description,
    Optional<LocalDate> startDate,
    Optional<LocalDate> deadlineDate,
    @NotBlank(message = "REQUIRED") String priority,
    Optional<String> color,
    Optional<String> icon,
    Set<UUID> labelIds,
    long version) {

  public ConvertToProjectRequest {
    if (description == null) description = Optional.empty();
    if (startDate == null) startDate = Optional.empty();
    if (deadlineDate == null) deadlineDate = Optional.empty();
    if (color == null) color = Optional.empty();
    if (icon == null) icon = Optional.empty();
    if (labelIds == null) labelIds = Set.of();
  }

  public ConvertToProjectCommand toCommand() {
    return new ConvertToProjectCommand(
        name, description, startDate, deadlineDate, priority, color, icon, labelIds);
  }
}
