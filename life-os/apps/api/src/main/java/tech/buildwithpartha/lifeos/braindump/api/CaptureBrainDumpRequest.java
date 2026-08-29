package tech.buildwithpartha.lifeos.braindump.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import tech.buildwithpartha.lifeos.braindump.application.CaptureBrainDumpCommand;

public record CaptureBrainDumpRequest(
    @NotBlank(message = "REQUIRED")
    @Size(max = 5000, message = "TOO_LONG")
    String content) {

  public CaptureBrainDumpCommand toCommand() {
    return new CaptureBrainDumpCommand(content);
  }
}
