package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;
import tech.buildwithpartha.lifeos.common.braindump.ConvertToNoteCommand;

public record ConvertToNoteRequest(
    @NotBlank(message = "REQUIRED") @Size(max = 500, message = "TOO_LONG") String title,
    @NotBlank(message = "REQUIRED") String body,
    Set<UUID> labelIds,
    long version) {

  public ConvertToNoteRequest {
    if (labelIds == null) {
      labelIds = Set.of();
    }
  }

  public ConvertToNoteCommand toCommand() {
    return new ConvertToNoteCommand(title, body, labelIds);
  }
}
