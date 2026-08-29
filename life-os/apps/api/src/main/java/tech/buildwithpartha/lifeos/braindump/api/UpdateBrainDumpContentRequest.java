package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tech.buildwithpartha.lifeos.braindump.application.UpdateBrainDumpContentCommand;

public record UpdateBrainDumpContentRequest(
    @NotBlank(message = "REQUIRED")
    @Size(max = 5000, message = "TOO_LONG")
    String content,
    long version) {

  public UpdateBrainDumpContentCommand toCommand() {
    return new UpdateBrainDumpContentCommand(content);
  }
}
